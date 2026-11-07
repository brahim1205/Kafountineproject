package sn.kafountine.gestionmunicipale.service;

import java.time.Instant;
import java.util.List;

public interface PortalPaymentStore {
  void save(PendingPayment payment);
  PendingPayment find(String paymentId);
  void delete(String paymentId);

  record PendingPayment(
    String paymentId,
    String contribuableId,
    List<String> taxIds,
    double amount,
    String phone,
    String method,
    Instant createdAt
  ) {}
}
