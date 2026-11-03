# frozen_string_literal: true

# Rake loads rakelib/*.rake automatically, so no Rakefile edit is needed to
# register the task (only to put yaml:duplicate_keys into `default`).

require_relative '../lib/yaml_duplicate_keys'

namespace :yaml do
  BASELINE_FILE = '.yaml-duplicate-keys-baseline'

  # One "path :: key" per line; blank lines and #-comments ignored.
  def self.read_baseline
    return [] unless File.exist?(BASELINE_FILE)

    File.readlines(BASELINE_FILE, chomp: true).map(&:strip).reject { |l| l.empty? || l.start_with?('#') }
  end

  desc 'Fail on repeated YAML mapping keys (the last copy silently wins); known ones go in .yaml-duplicate-keys-baseline'
  task :duplicate_keys do
    files = FileList['_config*.yml', '_data/**/*.{yml,yaml}', '.github/**/*.{yml,yaml}']
    baseline = read_baseline
    tolerated = []
    problems = []

    files.each do |file|
      YamlDuplicateKeys.check_file(file).each do |dup|
        entry = "#{dup.file} :: #{dup.key}"
        baseline.include?(entry) ? tolerated << entry : problems << dup.to_s
      end
    rescue Psych::SyntaxError => e
      problems << "#{file}: YAML syntax error: #{e.message}"
    end

    # A baseline entry that no longer matches means the duplicate was fixed:
    # force the line to be deleted so the baseline only ever shrinks.
    (baseline - tolerated).each do |entry|
      problems << "#{BASELINE_FILE}: `#{entry}` is no longer a duplicate; delete this line"
    end

    unless tolerated.empty?
      warn "yaml:duplicate_keys: #{tolerated.uniq.size} known duplicate key(s) tolerated " \
           "(listed in #{BASELINE_FILE}; each silently loses the earlier value)"
    end

    if problems.empty?
      puts "yaml:duplicate_keys: #{files.size} files, no new duplicate keys"
    else
      problems.each { |p| warn p }
      abort "yaml:duplicate_keys: #{problems.size} problem(s) found"
    end
  end
end
