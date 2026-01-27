import 'dart:convert';
import 'package:http/http.dart' as http;
import 'logger.dart';

/// Logged HTTP Client - wraps http package with automatic logging
class LoggedHttpClient {
  static final LoggedHttpClient _instance = LoggedHttpClient._internal();
  factory LoggedHttpClient() => _instance;
  LoggedHttpClient._internal();

  final http.Client _client = http.Client();

  /// GET request with logging
  Future<http.Response> get(
    Uri url, {
    Map<String, String>? headers,
  }) async {
    final stopwatch = Stopwatch()..start();
    
    logger.logRequest(
      method: 'GET',
      url: url.toString(),
      headers: headers,
    );

    try {
      final response = await _client.get(url, headers: headers);
      stopwatch.stop();
      
      logger.logResponse(
        method: 'GET',
        url: url.toString(),
        statusCode: response.statusCode,
        body: response.body,
        duration: stopwatch.elapsed,
      );
      
      return response;
    } catch (e, stackTrace) {
      stopwatch.stop();
      logger.logError(
        method: 'GET',
        url: url.toString(),
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  /// POST request with logging
  Future<http.Response> post(
    Uri url, {
    Map<String, String>? headers,
    Object? body,
    Encoding? encoding,
  }) async {
    final stopwatch = Stopwatch()..start();
    
    logger.logRequest(
      method: 'POST',
      url: url.toString(),
      headers: headers,
      body: body,
    );

    try {
      final response = await _client.post(
        url,
        headers: headers,
        body: body,
        encoding: encoding,
      );
      stopwatch.stop();
      
      logger.logResponse(
        method: 'POST',
        url: url.toString(),
        statusCode: response.statusCode,
        body: response.body,
        duration: stopwatch.elapsed,
      );
      
      return response;
    } catch (e, stackTrace) {
      stopwatch.stop();
      logger.logError(
        method: 'POST',
        url: url.toString(),
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  /// PUT request with logging
  Future<http.Response> put(
    Uri url, {
    Map<String, String>? headers,
    Object? body,
    Encoding? encoding,
  }) async {
    final stopwatch = Stopwatch()..start();
    
    logger.logRequest(
      method: 'PUT',
      url: url.toString(),
      headers: headers,
      body: body,
    );

    try {
      final response = await _client.put(
        url,
        headers: headers,
        body: body,
        encoding: encoding,
      );
      stopwatch.stop();
      
      logger.logResponse(
        method: 'PUT',
        url: url.toString(),
        statusCode: response.statusCode,
        body: response.body,
        duration: stopwatch.elapsed,
      );
      
      return response;
    } catch (e, stackTrace) {
      stopwatch.stop();
      logger.logError(
        method: 'PUT',
        url: url.toString(),
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  /// DELETE request with logging
  Future<http.Response> delete(
    Uri url, {
    Map<String, String>? headers,
    Object? body,
    Encoding? encoding,
  }) async {
    final stopwatch = Stopwatch()..start();
    
    logger.logRequest(
      method: 'DELETE',
      url: url.toString(),
      headers: headers,
      body: body,
    );

    try {
      final response = await _client.delete(
        url,
        headers: headers,
        body: body,
        encoding: encoding,
      );
      stopwatch.stop();
      
      logger.logResponse(
        method: 'DELETE',
        url: url.toString(),
        statusCode: response.statusCode,
        body: response.body,
        duration: stopwatch.elapsed,
      );
      
      return response;
    } catch (e, stackTrace) {
      stopwatch.stop();
      logger.logError(
        method: 'DELETE',
        url: url.toString(),
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  /// Streaming request with logging
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final stopwatch = Stopwatch()..start();
    
    logger.logRequest(
      method: request.method,
      url: request.url.toString(),
      headers: request.headers,
      body: request is http.Request ? request.body : null,
    );

    try {
      final response = await _client.send(request);
      stopwatch.stop();
      
      logger.info(
        'Streaming response started: ${response.statusCode} (${stopwatch.elapsedMilliseconds}ms)',
        'HTTP',
      );
      
      return response;
    } catch (e, stackTrace) {
      stopwatch.stop();
      logger.logError(
        method: request.method,
        url: request.url.toString(),
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }

  void close() => _client.close();
}

/// Global HTTP client instance
final httpClient = LoggedHttpClient();
