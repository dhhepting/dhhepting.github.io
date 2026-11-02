# frozen_string_literal: true

# Rake loads rakelib/*.rake automatically, so no Rakefile edit is needed to
# register the tasks (only to put yaml:duplicate_keys into `default`).

require 'rake/testtask'
require_relative '../lib/yaml_duplicate_keys'

Rake::TestTask.new('test:yaml_duplicate_keys') do |t|
  t.libs << 'lib' << 'test'
  t.test_files = FileList['test/yaml_duplicate_keys_test.rb']
  t.warning = true
end

namespace :yaml do
  desc 'Fail if any YAML config/data file repeats a mapping key (the last copy silently wins)'
  task :duplicate_keys do
    files = FileList['_config*.yml', '_data/**/*.{yml,yaml}', '.github/**/*.{yml,yaml}']
    dups = YamlDuplicateKeys.check_files(files)
    if dups.empty?
      puts "yaml:duplicate_keys: #{files.size} files, no duplicate keys"
    else
      dups.each { |d| warn d.to_s }
      abort "yaml:duplicate_keys: #{dups.size} duplicate key(s) found"
    end
  end
end