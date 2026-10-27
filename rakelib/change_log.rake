# frozen_string_literal: true

# Rake loads rakelib/*.rake automatically, so no Rakefile edit is needed.

require 'rake/testtask'

ROOT = File.expand_path('..', __dir__)

Rake::TestTask.new('test:change_log') do |t|
  t.libs << 'lib' << 'test'
  t.test_files = FileList['test/change_log_test.rb']
  t.warning = true
end

namespace :changes do
  desc 'Fail unless git history is complete (run in CI before `jekyll build`)'
  task :check do
    $LOAD_PATH.unshift(File.join(ROOT, 'lib'))
    require 'change_log'
    ChangeLog.assert_full_history!(ROOT)
    puts 'git history is complete'
  end
end
