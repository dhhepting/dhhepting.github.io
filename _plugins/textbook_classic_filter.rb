# frozen_string_literal: true

# Publish only *.html and README* files from
# teaching/CS-315/202630/code/textbook-classic/{02..11}/ (any depth below).
# Jekyll's `exclude:` has no "everything except" form, so whitelist here.
module TextbookClassicFilter
  DIR  = %r{(?:\A|/)teaching/CS-315/202630/code/textbook-classic/(?:0[2-9]|1[01])/}
  KEEP = ->(path) { path.end_with?('.html') || File.basename(path).match?(/\AREADME/i) }

  def self.hidden?(relative_path)
    relative_path.match?(DIR) && !KEEP.call(relative_path)
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  before = site.static_files.size
  site.static_files.reject! { |f| TextbookClassicFilter.hidden?(f.relative_path) }
  site.pages.reject!        { |p| TextbookClassicFilter.hidden?(p.relative_path) }
  Jekyll.logger.info 'TextbookClassic:', "hid #{before - site.static_files.size} static files"
end