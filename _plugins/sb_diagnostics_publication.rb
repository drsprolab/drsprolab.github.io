# frozen_string_literal: true
# A single explicit switch controls SB cards AND their directly reachable files.
# Keep all source files intact so an authorized re-publication is reversible.
module SbDiagnosticsPublication
  def self.withheld_path?(path)
    relative = path.to_s.sub(%r{\A/+}, '')
    relative.match?(%r{\Ain-progress/starbucks-ai-(?:store|hq)(?:/|\z)}) ||
      relative == 'assets/js/starbucks-ai.js' ||
      relative.start_with?('assets/files/starbucks-ai-') ||
      relative.match?(%r{\Aassets/og/in-progress/(?:starbucks-ai-|sb-enterprise-ai-)})
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  # Fail closed: absent, quoted or otherwise non-boolean values do not publish.
  next if site.config['sb_diagnostics_published'] == true

  site.pages.reject! { |page| SbDiagnosticsPublication.withheld_path?(page.path) }
  site.static_files.reject! { |file| SbDiagnosticsPublication.withheld_path?(file.relative_path) }
end
