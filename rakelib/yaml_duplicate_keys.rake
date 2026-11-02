# frozen_string_literal: true

# Rake loads rakelib/*.rake automatically, so no Rakefile edit is needed to
# register the task (only to put yaml:duplicate_keys into `default`).

require_relative '../lib/yaml_duplicate_keys'

namespace :yaml do
  desc 'Fail if any YAML config/data file repeats a mapping key (the last copy silently wins)'
  task :duplicate_keys do
    files = FileList['_config*.yml', '_data/**/*.{yml,yaml}', '.github/**/*.{yml,yaml}']
    problems = []
    files.each do |file|
      problems.concat(YamlDuplicateKeys.check_file(file).map(&:to_s))
    rescue Psych::SyntaxError => e
      problems << "#{file}: YAML syntax error: #{e.message}"
    end

    if problems.empty?
      puts "yaml:duplicate_keys: #{files.size} files, no duplicate keys"
    else
      problems.each { |p| warn p }
      abort "yaml:duplicate_keys: #{problems.size} problem(s) found"
    end
  end
end
