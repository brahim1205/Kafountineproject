package sn.kafountine.gestionmunicipale.service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Service;

@Service
public class InMemoryPortalPaymentStore implements PortalPaymentStore {
  private static final Duration TTL = Duration.ofMinutes(30);
  private final ConcurrentMap<String, PendingPayment> payments = new ConcurrentHashMap<>();

  @Override
  public void save(PendingPayment payment) {
    payments.put(payment.paymentId(), payment);
  }

  @Override
  public PendingPayment find(String paymentId) {
    PendingPayment payment = payments.get(paymentId);
    if (payment == null) return null;
    if (payment.createdAt().plus(TTL).isBefore(Instant.now())) {
      payments.remove(paymentId);
      return null;
    }
    return payment;
  }

  @Override
  public void delete(String paymentId) {
    payments.remove(paymentId);
  }
}
