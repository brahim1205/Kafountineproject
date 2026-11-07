package sn.kafountine.gestionmunicipale.dto;

import java.util.Map;

public record ApiResponse<T>(boolean success, T data, String message, Map<String, Object> meta) {
  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>(true, data, null, null);
  }

  public static <T> ApiResponse<T> ok(T data, Map<String, Object> meta) {
    return new ApiResponse<>(true, data, null, meta);
  }

  public static ApiResponse<Void> message(String message) {
    return new ApiResponse<>(true, null, message, null);
  }
}
