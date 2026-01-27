import 'package:supabase_flutter/supabase_flutter.dart';
import 'logger.dart';

/// Extension to log Supabase function calls
extension SupabaseFunctionsLogger on FunctionsClient {
  /// Invoke a function with logging
  Future<FunctionResponse> invokeWithLogging(
    String functionName, {
    Map<String, String>? headers,
    Map<String, dynamic>? body,
    HttpMethod method = HttpMethod.post,
  }) async {
    final stopwatch = Stopwatch()..start();
    final url = 'supabase/functions/v1/$functionName';
    
    logger.logRequest(
      method: method.name.toUpperCase(),
      url: url,
      headers: headers,
      body: body,
    );

    try {
      final response = await invoke(
        functionName,
        headers: headers,
        body: body,
        method: method,
      );
      stopwatch.stop();
      
      logger.logResponse(
        method: method.name.toUpperCase(),
        url: url,
        statusCode: response.status,
        body: response.data,
        duration: stopwatch.elapsed,
      );
      
      return response;
    } catch (e, stackTrace) {
      stopwatch.stop();
      logger.logError(
        method: method.name.toUpperCase(),
        url: url,
        error: e,
        stackTrace: stackTrace,
      );
      rethrow;
    }
  }
}

/// Extension to log Supabase database queries
extension SupabaseQueryLogger on SupabaseQueryBuilder {
  void logQuery(String operation, String table, {Map<String, dynamic>? filters}) {
    logger.info(
      '$operation on "$table"${filters != null ? ' with filters: $filters' : ''}',
      'SUPABASE',
    );
  }
}
