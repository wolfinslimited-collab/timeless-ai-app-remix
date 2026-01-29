import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../data/countries.dart';

export '../data/countries.dart' show Country, countries, getCountryByCode;

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
  final _focusNode = FocusNode();
  List<Country> _filteredCountries = countries;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(_filterCountries);
    // Auto-focus search field
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _focusNode.dispose();
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
      height: MediaQuery.of(context).size.height * 0.8,
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
              focusNode: _focusNode,
              decoration: InputDecoration(
                hintText: 'Search countries...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        onPressed: () {
                          _searchController.clear();
                        },
                        icon: const Icon(Icons.close, size: 20),
                      )
                    : null,
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

          // Country count
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                '${_filteredCountries.length} ${_filteredCountries.length == 1 ? 'country' : 'countries'}',
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.muted.withOpacity(0.7),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Country list
          Expanded(
            child: _filteredCountries.isEmpty
                ? Center(
                    child: Text(
                      'No countries found',
                      style: TextStyle(
                        color: AppTheme.muted.withOpacity(0.7),
                      ),
                    ),
                  )
                : ListView.builder(
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
