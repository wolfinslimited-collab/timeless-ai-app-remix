import 'package:flutter/material.dart';
import '../core/theme.dart';

class Country {
  final String code;
  final String name;
  final String flag;

  const Country({required this.code, required this.name, required this.flag});
}

const List<Country> countries = [
  Country(code: 'US', name: 'United States', flag: '🇺🇸'),
  Country(code: 'GB', name: 'United Kingdom', flag: '🇬🇧'),
  Country(code: 'CA', name: 'Canada', flag: '🇨🇦'),
  Country(code: 'AU', name: 'Australia', flag: '🇦🇺'),
  Country(code: 'DE', name: 'Germany', flag: '🇩🇪'),
  Country(code: 'FR', name: 'France', flag: '🇫🇷'),
  Country(code: 'ES', name: 'Spain', flag: '🇪🇸'),
  Country(code: 'IT', name: 'Italy', flag: '🇮🇹'),
  Country(code: 'BR', name: 'Brazil', flag: '🇧🇷'),
  Country(code: 'MX', name: 'Mexico', flag: '🇲🇽'),
  Country(code: 'IN', name: 'India', flag: '🇮🇳'),
  Country(code: 'JP', name: 'Japan', flag: '🇯🇵'),
  Country(code: 'KR', name: 'South Korea', flag: '🇰🇷'),
  Country(code: 'CN', name: 'China', flag: '🇨🇳'),
  Country(code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪'),
  Country(code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦'),
  Country(code: 'NL', name: 'Netherlands', flag: '🇳🇱'),
  Country(code: 'SE', name: 'Sweden', flag: '🇸🇪'),
  Country(code: 'CH', name: 'Switzerland', flag: '🇨🇭'),
  Country(code: 'PL', name: 'Poland', flag: '🇵🇱'),
  Country(code: 'RU', name: 'Russia', flag: '🇷🇺'),
  Country(code: 'TR', name: 'Turkey', flag: '🇹🇷'),
  Country(code: 'ZA', name: 'South Africa', flag: '🇿🇦'),
  Country(code: 'NG', name: 'Nigeria', flag: '🇳🇬'),
  Country(code: 'EG', name: 'Egypt', flag: '🇪🇬'),
  Country(code: 'AR', name: 'Argentina', flag: '🇦🇷'),
  Country(code: 'CL', name: 'Chile', flag: '🇨🇱'),
  Country(code: 'CO', name: 'Colombia', flag: '🇨🇴'),
  Country(code: 'PH', name: 'Philippines', flag: '🇵🇭'),
  Country(code: 'ID', name: 'Indonesia', flag: '🇮🇩'),
  Country(code: 'MY', name: 'Malaysia', flag: '🇲🇾'),
  Country(code: 'SG', name: 'Singapore', flag: '🇸🇬'),
  Country(code: 'TH', name: 'Thailand', flag: '🇹🇭'),
  Country(code: 'VN', name: 'Vietnam', flag: '🇻🇳'),
  Country(code: 'PK', name: 'Pakistan', flag: '🇵🇰'),
  Country(code: 'BD', name: 'Bangladesh', flag: '🇧🇩'),
  Country(code: 'IR', name: 'Iran', flag: '🇮🇷'),
  Country(code: 'IL', name: 'Israel', flag: '🇮🇱'),
  Country(code: 'NO', name: 'Norway', flag: '🇳🇴'),
  Country(code: 'DK', name: 'Denmark', flag: '🇩🇰'),
  Country(code: 'FI', name: 'Finland', flag: '🇫🇮'),
  Country(code: 'IE', name: 'Ireland', flag: '🇮🇪'),
  Country(code: 'PT', name: 'Portugal', flag: '🇵🇹'),
  Country(code: 'GR', name: 'Greece', flag: '🇬🇷'),
  Country(code: 'CZ', name: 'Czech Republic', flag: '🇨🇿'),
  Country(code: 'AT', name: 'Austria', flag: '🇦🇹'),
  Country(code: 'BE', name: 'Belgium', flag: '🇧🇪'),
  Country(code: 'HU', name: 'Hungary', flag: '🇭🇺'),
  Country(code: 'RO', name: 'Romania', flag: '🇷🇴'),
  Country(code: 'UA', name: 'Ukraine', flag: '🇺🇦'),
  Country(code: 'NZ', name: 'New Zealand', flag: '🇳🇿'),
  Country(code: 'OTHER', name: 'Other', flag: '🌍'),
];

Country? getCountryByCode(String? code) {
  if (code == null) return null;
  try {
    return countries.firstWhere((c) => c.code == code);
  } catch (_) {
    return null;
  }
}

class CountryPickerField extends StatelessWidget {
  final String? selectedCode;
  final ValueChanged<String?> onChanged;
  final bool enabled;

  const CountryPickerField({
    super.key,
    this.selectedCode,
    required this.onChanged,
    this.enabled = true,
  });

  void _showPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CountryPickerSheet(
        selectedCode: selectedCode,
        onSelect: (code) {
          onChanged(code);
          Navigator.pop(context);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final country = getCountryByCode(selectedCode);

    return GestureDetector(
      onTap: enabled ? () => _showPicker(context) : null,
      child: Container(
        height: 56,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.muted.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            const Icon(Icons.public, color: AppTheme.muted, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: country != null
                  ? Row(
                      children: [
                        Text(
                          country.flag,
                          style: const TextStyle(fontSize: 20),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            country.name,
                            style: const TextStyle(fontSize: 16),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    )
                  : Text(
                      'Select Country',
                      style: TextStyle(
                        color: AppTheme.muted.withOpacity(0.7),
                        fontSize: 16,
                      ),
                    ),
            ),
            Icon(
              Icons.keyboard_arrow_down,
              color: AppTheme.muted.withOpacity(0.7),
            ),
          ],
        ),
      ),
    );
  }
}

class CountryPickerSheet extends StatefulWidget {
  final String? selectedCode;
  final ValueChanged<String> onSelect;

  const CountryPickerSheet({
    super.key,
    this.selectedCode,
    required this.onSelect,
  });

  @override
  State<CountryPickerSheet> createState() => _CountryPickerSheetState();
}

class _CountryPickerSheetState extends State<CountryPickerSheet> {
  final _searchController = TextEditingController();
  List<Country> _filteredCountries = countries;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_filterCountries);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterCountries() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredCountries = countries;
      } else {
        _filteredCountries = countries
            .where((c) =>
                c.name.toLowerCase().contains(query) ||
                c.code.toLowerCase().contains(query))
            .toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: const BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle bar
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.muted.withOpacity(0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Title
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Text(
                  'Select Country',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),

          // Search field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search countries...',
                prefixIcon: const Icon(Icons.search, size: 20),
                filled: true,
                fillColor: AppTheme.background,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Country list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              itemCount: _filteredCountries.length,
              itemBuilder: (context, index) {
                final country = _filteredCountries[index];
                final isSelected = country.code == widget.selectedCode;

                return ListTile(
                  onTap: () => widget.onSelect(country.code),
                  leading: Text(
                    country.flag,
                    style: const TextStyle(fontSize: 24),
                  ),
                  title: Text(
                    country.name,
                    style: TextStyle(
                      fontWeight:
                          isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                  trailing: isSelected
                      ? const Icon(
                          Icons.check_circle,
                          color: AppTheme.primary,
                        )
                      : null,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  tileColor:
                      isSelected ? AppTheme.primary.withOpacity(0.1) : null,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
