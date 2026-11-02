# frozen_string_literal: true

# Rake loads rakelib/*.rake automatically, so no Rakefile edit is needed.

root = File.expand_path('..', __dir__)

namespace :changes do
  desc 'Fail unless git history is complete (run in CI before `jekyll build`)'
  task :check do
    $LOAD_PATH.unshift(File.join(root, 'lib'))
    require 'change_log'
    ChangeLog.assert_full_history!(root)
    puts 'git history is complete'
  end

  desc 'List commits touching at least N files (default 50), ready to paste into .changes-ignore-revs'
  task :bulk, [:min] do |_task, args|
    $LOAD_PATH.unshift(File.join(root, 'lib'))
    require 'change_log'
    min = Integer(args[:min] || 50)
    ChangeLog.bulk_commits(ChangeLog.commits(repo: root), min).each do |c|
      puts "#{c.sha}  # #{c.time.strftime('%Y-%m-%d')} #{c.subject} (#{c.files.size} files)"
    end
  end
end
