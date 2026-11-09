import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStoredUserRole } from '../../../services/auth';
import { ensureContribuableByIdentity } from '../../../services/contribuables';
import { createTransaction, getTaxCategories, getTaxServices, type TaxCategory, type TaxService } from '../../../services/taxes';
import { useToast } from '../../../components/feature/Toast';
import { validateFormElement } from '../../../utils/formValidation';


export type ReceiptTransaction = {
  numero: string;
  date: string;
  heure: string;
  contribuable: string;
  type: string;
  montant: number;
  agent: string;
  telephone: string;
  nin: string;
  adresse: string;
  categorie?: string;
  service?: string;
  quantite?: number;
  unite?: string;
  tarifUnitaire?: number;
  modePaiement?: string;
  statut?: string;
  reference?: string;
};

export function useNouvelleTransaction() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const preselectedCategoryId =
    typeof (location.state as { categorieId?: unknown } | null)?.categorieId === 'string'
      ? ((location.state as { categorieId: string }).categorieId)
      : '';
  const isEtatCivil = getStoredUserRole() === 'etat_civil';
  const isRegisseur = getStoredUserRole() === 'regisseur';
  const [etape, setEtape] = useState(1);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showRecuModal, setShowRecuModal] = useState(false);
  const [transactionData, setTransactionData] = useState<ReceiptTransaction | null>(null);
  const [transactionValidee, setTransactionValidee] = useState(false);
  const [categories, setCategories] = useState<TaxCategory[]>([]);
  const [services, setServices] = useState<TaxService[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    categorie: isEtatCivil ? 'etat-civil' : preselectedCategoryId,
    service: '',
    contribuable: '',
    cni: '',
    telephone: '',
    adresse: '',
    quantite: 1,
    notes: ''
  });

  useEffect(() => {
    getTaxCategories()
      .then((data) => {
        const nextCategories = (data || []).filter((category) => (isEtatCivil ? category.id === 'etat-civil' : !isRegisseur || category.id !== 'etat-civil'));
        setCategories(nextCategories);
        if (preselectedCategoryId && !nextCategories.some((category) => category.id === preselectedCategoryId)) {
          setFormData((current) => ({ ...current, categorie: '' }));
        }
      })
      .catch(() => {
        setCategories([]);
        showToast('Impossible de charger les catégories de taxe.', 'error');
      });
  }, [preselectedCategoryId, showToast, isEtatCivil, isRegisseur]);

  useEffect(() => {
    if (!formData.categorie) {
      setServices([]);
      return;
    }
    getTaxServices(formData.categorie)
      .then((data) => setServices(data || []))
      .catch(() => {
        setServices([]);
        showToast('Impossible de charger les services de cette catégorie.', 'error');
      });
  }, [formData.categorie]);

  const categorieSelectionnee = categories.find(c => c.id === formData.categorie);
  const serviceSelectionne = services.find(s => s.id === formData.service);
  
  const montantTotal = serviceSelectionne 
    ? serviceSelectionne.tarif * formData.quantite 
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (etape === 1) {
      if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
        return;
      }
      setEtape(2);
    } else if (etape === 2) {
      if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
        return;
      }
      setEtape(3);
    } else {
      if (!validateFormElement(e.currentTarget as HTMLFormElement)) {
        return;
      }
      try {
        setIsSubmitting(true);
        const contribuable = await ensureContribuableByIdentity({
          cni: formData.cni,
          fullName: formData.contribuable,
          telephone: formData.telephone,
          adresse: formData.adresse,
        });

        const reference = `TX-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
        const created = await createTransaction({
          contribuableId: contribuable.id,
          categorie: formData.categorie,
          type: formData.categorie,
          service: serviceSelectionne?.nom || formData.service,
          quantite: formData.quantite,
          montant: montantTotal,
          modePaiement: 'ESPECE',
          reference,
        });

        const now = new Date();
        const newTransaction = {
          numero: created?.numero || reference,
          date: now.toISOString(),
          heure: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          contribuable: formData.contribuable,
          type: serviceSelectionne?.nom || '',
          montant: montantTotal,
          agent: 'Agent Municipal',
          telephone: formData.telephone,
          nin: formData.cni,
          adresse: formData.adresse,
          categorie: categorieSelectionnee?.nom || formData.categorie,
          service: serviceSelectionne?.nom || formData.service,
          quantite: formData.quantite,
          unite: serviceSelectionne?.unite || '',
          tarifUnitaire: serviceSelectionne?.tarif || 0,
          modePaiement: 'ESPECE',
          statut: 'PAYE',
          reference,
        };
        setTransactionData(newTransaction);
        setTransactionValidee(true);
        setTimeout(() => {
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
          }, 3000);
        }, 100);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Impossible d\'enregistrer la transaction.';
        showToast(errorMessage, 'error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (etape > 1) {
      setEtape(etape - 1);
    } else {
      navigate(isEtatCivil ? '/taxes/etat-civil' : '/taxes');
    }
  };

  const handleRetourListe = () => {
    navigate(formData.categorie ? `/taxes/${formData.categorie}` : '/taxes');
  };

  const handleGenererRecu = () => {
    setShowRecuModal(true);
  };


  return { categorieSelectionnee, categories, etape, formData, handleBack, handleGenererRecu, handleRetourListe, handleSubmit, isSubmitting, montantTotal, preselectedCategoryId, serviceSelectionne, services, setFormData, setShowRecuModal, showRecuModal, showSuccessMessage, transactionData, transactionValidee };
}
