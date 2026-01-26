import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';

class FinancialSection {
  final String sentiment;
  final List<String> keyPoints;
  final String content;

  FinancialSection({
    required this.sentiment,
    required this.keyPoints,
    required this.content,
  });

  factory FinancialSection.fromJson(Map<String, dynamic> json) {
    return FinancialSection(
      sentiment: json['sentiment'] ?? 'neutral',
      keyPoints: List<String>.from(json['keyPoints'] ?? []),
      content: json['content'] ?? '',
    );
  }
}

class FinancialAnalysis {
  final String overallSentiment;
  final String priceTarget;
  final FinancialSection? executive;
  final FinancialSection? technical;
  final FinancialSection? derivatives;
  final FinancialSection? onchain;
  final FinancialSection? news;
  final FinancialSection? social;
  final FinancialSection? whale;
  final FinancialSection? actionable;
  final FinancialSection? conclusion;

  FinancialAnalysis({
    required this.overallSentiment,
    required this.priceTarget,
    this.executive,
    this.technical,
    this.derivatives,
    this.onchain,
    this.news,
    this.social,
    this.whale,
    this.actionable,
    this.conclusion,
  });

  factory FinancialAnalysis.fromJson(Map<String, dynamic> json) {
    final sections = json['sections'] as Map<String, dynamic>? ?? {};
    
    return FinancialAnalysis(
      overallSentiment: json['overallSentiment'] ?? 'neutral',
      priceTarget: json['priceTarget'] ?? '',
      executive: sections['executive'] != null
          ? FinancialSection.fromJson(sections['executive'])
          : null,
      technical: sections['technical'] != null
          ? FinancialSection.fromJson(sections['technical'])
          : null,
      derivatives: sections['derivatives'] != null
          ? FinancialSection.fromJson(sections['derivatives'])
          : null,
      onchain: sections['onchain'] != null
          ? FinancialSection.fromJson(sections['onchain'])
          : null,
      news: sections['news'] != null
          ? FinancialSection.fromJson(sections['news'])
          : null,
      social: sections['social'] != null
          ? FinancialSection.fromJson(sections['social'])
          : null,
      whale: sections['whale'] != null
          ? FinancialSection.fromJson(sections['whale'])
          : null,
      actionable: sections['actionable'] != null
          ? FinancialSection.fromJson(sections['actionable'])
          : null,
      conclusion: sections['conclusion'] != null
          ? FinancialSection.fromJson(sections['conclusion'])
          : null,
    );
  }

  List<MapEntry<String, FinancialSection>> get allSections {
    final list = <MapEntry<String, FinancialSection>>[];
    if (executive != null) list.add(MapEntry('Executive Summary', executive!));
    if (technical != null) list.add(MapEntry('Technical Analysis', technical!));
    if (derivatives != null) list.add(MapEntry('Derivatives', derivatives!));
    if (onchain != null) list.add(MapEntry('On-Chain / Fundamentals', onchain!));
    if (news != null) list.add(MapEntry('News & Market', news!));
    if (social != null) list.add(MapEntry('Social Sentiment', social!));
    if (whale != null) list.add(MapEntry('Whale Activity', whale!));
    if (actionable != null) list.add(MapEntry('Action Plan', actionable!));
    if (conclusion != null) list.add(MapEntry('Conclusion', conclusion!));
    return list;
  }
}

class FinancialService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Analyze asset (crypto/stock) - text query
  Future<FinancialAnalysis> analyzeAsset({
    required String query,
    bool deepMode = false,
  }) async {
    final response = await _supabase.functions.invoke(
      'financial-ai',
      body: {
        'query': query,
        'deepMode': deepMode,
      },
    );

    if (response.status != 200) {
      final error = response.data?['error'] ?? 'Analysis failed';
      throw Exception(error);
    }

    final analysis = response.data['analysis'];
    if (analysis == null) {
      throw Exception('No analysis data returned');
    }

    return FinancialAnalysis.fromJson(analysis);
  }

  /// Analyze chart image
  Future<FinancialAnalysis> analyzeChart({
    required String imageBase64,
    String? context,
    bool deepMode = false,
  }) async {
    final response = await _supabase.functions.invoke(
      'financial-ai',
      body: {
        'query': context,
        'image': imageBase64,
        'deepMode': deepMode,
      },
    );

    if (response.status != 200) {
      final error = response.data?['error'] ?? 'Analysis failed';
      throw Exception(error);
    }

    final analysis = response.data['analysis'];
    if (analysis == null) {
      throw Exception('No analysis data returned');
    }

    return FinancialAnalysis.fromJson(analysis);
  }

  /// Save analysis report
  Future<void> saveReport({
    required String symbol,
    required String assetType,
    required String analysisContent,
    Map<String, dynamic>? priceData,
    Map<String, dynamic>? technicalData,
  }) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) throw Exception('Not authenticated');

    await _supabase.from('financial_reports').insert({
      'user_id': userId,
      'symbol': symbol,
      'asset_type': assetType,
      'analysis_content': analysisContent,
      'price_data': priceData,
      'technical_data': technicalData,
    });
  }

  /// Get saved reports
  Future<List<Map<String, dynamic>>> getSavedReports() async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return [];

    final response = await _supabase
        .from('financial_reports')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .limit(20);

    return List<Map<String, dynamic>>.from(response);
  }

  /// Delete report
  Future<void> deleteReport(String reportId) async {
    await _supabase.from('financial_reports').delete().eq('id', reportId);
  }
}
