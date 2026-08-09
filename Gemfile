source "https://rubygems.org"

#git_source(:github) {|repo_name| 'https://github.com/#{repo_name}' }

# When you want to use a different version, change it below, save the
# file and run `bundle install`. Run Jekyll with `bundle exec`, like so:
#
#     bundle exec jekyll serve
#
# This will help ensure the proper Jekyll version is running.

# Formerly default gems, removed in Ruby 3.4 — must be declared now
  gem "csv"
  gem "base64"
  gem "bigdecimal"

  # Removed from default gems in Ruby 3.5 — declare now so the next
  # Ruby bump doesn't break you the same way
  gem "logger"

  # Needed for `jekyll serve` on Ruby 3.x (left stdlib back in Ruby 3.0)
  gem "webrick"

gem "jekyll"
gem 'nokogiri', '~> 1.15', '>= 1.15.4'
gem 'racc', '~> 1.7', '>= 1.7.1'
gem 'async', '~> 2.6', '>= 2.6.4'
gem 'io-event', '~> 1.3', '>= 1.3.2'
gem 'html-proofer', '~> 5.0', '>= 5.0.8'

group :jekyll_plugins do
   gem 'jekyll-seo-tag'
   gem 'jekyll-sitemap'
   gem 'jekyll-redirect-from'
end


gem "creole", "~> 0.5.0"
