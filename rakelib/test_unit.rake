# frozen_string_literal: true

require 'rake/testtask'

# One task for every unit test under test/ (lib/ and plugin logic; no Jekyll
# build, no network).  It is part of `rake` (default), so CI runs it.
# Run a single file while iterating:
#   bundle exec rake test:unit TEST=test/change_log_test.rb
Rake::TestTask.new('test:unit') do |t|
  t.libs << 'lib' << 'test'
  t.pattern = 'test/**/*_test.rb'
  t.warning = true
end
