# frozen_string_literal: true

require 'fileutils'
require 'open3'
require 'tmpdir'

REPO_URL = 'https://github.com/example/site'

# Builds throwaway git repositories with a known history.
module GitRepoHelper
  def setup
    @dir  = Dir.mktmpdir('change_log_test')
    @repo = File.join(@dir, 'repo')
    FileUtils.mkdir_p(@repo)
    git(@repo, 'init', '-q')
    git(@repo, 'config', 'user.name', 'Test')
    git(@repo, 'config', 'user.email', 'test@example.org')
    git(@repo, 'config', 'commit.gpgsign', 'false')
    build_history
  end

  def teardown
    FileUtils.remove_entry(@dir)
  end

  private

  def git(dir, *args, env: {})
    out, status = Open3.capture2e(env, 'git', '-C', dir, *args)
    raise "git #{args.join(' ')} failed: #{out}" unless status.success?

    out
  end

  def write(path, text)
    full = File.join(@repo, path)
    FileUtils.mkdir_p(File.dirname(full))
    File.write(full, text)
  end

  def commit(iso, subject)
    yield
    git(@repo, 'add', '-A')
    git(@repo, 'commit', '-q', '-m', subject,
        env: { 'GIT_AUTHOR_DATE' => iso, 'GIT_COMMITTER_DATE' => iso })
  end

  def sha_of(subject)
    line = git(@repo, 'log', '--format=%H%x09%s').lines.find { |l| l.chomp.split("\t", 2).last == subject }
    raise "no commit with subject #{subject.inspect}" unless line

    line.split("\t").first
  end
end