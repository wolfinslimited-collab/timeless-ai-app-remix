import 'dart:convert';
import 'dart:developer' as developer;
import 'package:flutter/foundation.dart';

/// Pretty HTTP Logger - Similar to Pretty Dio Logger
/// Logs all network requests with beautiful formatting
class AppLogger {
  static final AppLogger _instance = AppLogger._internal();
  factory AppLogger() => _instance;
  AppLogger._internal();

  static const String _reset = '\x1B[0m';
  static const String _red = '\x1B[31m';
  static const String _green = '\x1B[32m';
  static const String _yellow = '\x1B[33m';
  static const String _blue = '\x1B[34m';
  static const String _magenta = '\x1B[35m';
  static const String _cyan = '\x1B[36m';

  bool _enabled = kDebugMode;
  
  void enable() => _enabled = true;
  void disable() => _enabled = false;

  /// Log HTTP Request
  void logRequest({
    required String method,
    required String url,
    Map<String, String>? headers,
    dynamic body,
  }) {
    if (!_enabled) return;

    final buffer = StringBuffer();
    buffer.writeln('');
    buffer.writeln('$_cyan╔══════════════════════════════════════════════════════════════$_reset');
    buffer.writeln('$_cyan║ 🚀 REQUEST$_reset');
    buffer.writeln('$_cyan╟──────────────────────────────────────────────────────────────$_reset');
    buffer.writeln('$_cyan║$_reset $_yellow$method$_reset $url');
    
    if (headers != null && headers.isNotEmpty) {
      buffer.writeln('$_cyan╟──────────────────────────────────────────────────────────────$_reset');
      buffer.writeln('$_cyan║$_reset $_magenta Headers:$_reset');
      headers.forEach((key, value) {
        // Mask authorization tokens for security
        final displayValue = key.toLowerCase() == 'authorization' 
            ? '${value.substring(0, 20)}...[MASKED]' 
            : value;
        buffer.writeln('$_cyan║$_reset   $key: $displayValue');
      });
    }
    
    if (body != null) {
      buffer.writeln('$_cyan╟──────────────────────────────────────────────────────────────$_reset');
      buffer.writeln('$_cyan║$_reset $_magenta Body:$_reset');
      final prettyBody = _prettyJson(body);
      for (final line in prettyBody.split('\n')) {
        buffer.writeln('$_cyan║$_reset   $line');
      }
    }
    
    buffer.writeln('$_cyan╚══════════════════════════════════════════════════════════════$_reset');
    
    _print(buffer.toString());
  }

  /// Log HTTP Response
  void logResponse({
    required String method,
    required String url,
    required int statusCode,
    dynamic body,
    Duration? duration,
  }) {
    if (!_enabled) return;

    final isSuccess = statusCode >= 200 && statusCode < 300;
    final statusColor = isSuccess ? _green : _red;
    final statusEmoji = isSuccess ? '✅' : '❌';
    
    final buffer = StringBuffer();
    buffer.writeln('');
    buffer.writeln('$statusColor╔══════════════════════════════════════════════════════════════$_reset');
    buffer.writeln('$statusColor║ $statusEmoji RESPONSE [$statusCode]${duration != null ? ' (${duration.inMilliseconds}ms)' : ''}$_reset');
    buffer.writeln('$statusColor╟──────────────────────────────────────────────────────────────$_reset');
    buffer.writeln('$statusColor║$_reset $_yellow$method$_reset $url');
    
    if (body != null) {
      buffer.writeln('$statusColor╟──────────────────────────────────────────────────────────────$_reset');
      buffer.writeln('$statusColor║$_reset $_magenta Body:$_reset');
      final prettyBody = _prettyJson(body);
      // Limit response body to prevent console overflow
      final lines = prettyBody.split('\n');
      final maxLines = 50;
      for (var i = 0; i < lines.length && i < maxLines; i++) {
        buffer.writeln('$statusColor║$_reset   ${lines[i]}');
      }
      if (lines.length > maxLines) {
        buffer.writeln('$statusColor║$_reset   ... (${lines.length - maxLines} more lines)');
      }
    }
    
    buffer.writeln('$statusColor╚══════════════════════════════════════════════════════════════$_reset');
    
    _print(buffer.toString());
  }

  /// Log Error
  void logError({
    required String method,
    required String url,
    required dynamic error,
    StackTrace? stackTrace,
  }) {
    if (!_enabled) return;

    final buffer = StringBuffer();
    buffer.writeln('');
    buffer.writeln('$_red╔══════════════════════════════════════════════════════════════$_reset');
    buffer.writeln('$_red║ ⚠️ ERROR$_reset');
    buffer.writeln('$_red╟──────────────────────────────────────────────────────────────$_reset');
    buffer.writeln('$_red║$_reset $_yellow$method$_reset $url');
    buffer.writeln('$_red╟──────────────────────────────────────────────────────────────$_reset');
    buffer.writeln('$_red║$_reset Error: $error');
    
    if (stackTrace != null) {
      buffer.writeln('$_red╟──────────────────────────────────────────────────────────────$_reset');
      final stackLines = stackTrace.toString().split('\n').take(10);
      for (final line in stackLines) {
        buffer.writeln('$_red║$_reset   $line');
      }
    }
    
    buffer.writeln('$_red╚══════════════════════════════════════════════════════════════$_reset');
    
    _print(buffer.toString());
  }

  /// Log general info
  void info(String message, [String? tag]) {
    if (!_enabled) return;
    _print('$_blue[${tag ?? 'INFO'}]$_reset $message');
  }

  /// Log warning
  void warning(String message, [String? tag]) {
    if (!_enabled) return;
    _print('$_yellow[${tag ?? 'WARN'}]$_reset $message');
  }

  /// Log debug
  void debug(String message, [String? tag]) {
    if (!_enabled) return;
    _print('$_magenta[${tag ?? 'DEBUG'}]$_reset $message');
  }

  /// Log success
  void success(String message, [String? tag]) {
    if (!_enabled) return;
    _print('$_green[${tag ?? 'SUCCESS'}]$_reset $message');
  }

  /// Log error
  void error(String message, [String? tag]) {
    if (!_enabled) return;
    _print('$_red[${tag ?? 'ERROR'}]$_reset $message');
  }

  String _prettyJson(dynamic data) {
    try {
      if (data is String) {
        // Try to parse as JSON
        final parsed = jsonDecode(data);
        return const JsonEncoder.withIndent('  ').convert(parsed);
      } else if (data is Map || data is List) {
        return const JsonEncoder.withIndent('  ').convert(data);
      }
      return data.toString();
    } catch (_) {
      return data.toString();
    }
  }

  void _print(String message) {
    if (kDebugMode) {
      // Use debugPrint for proper console output
      debugPrint(message);
      // Also log to developer tools
      developer.log(message, name: 'AppLogger');
    }
  }
}

/// Global logger instance
final logger = AppLogger();
