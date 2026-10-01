module Jekyll
  module DirExistsFilter
    def dir_exists?(dir_path)
      Dir.exist?(source_path(dir_path))
    end

    # {{ '/assets/teaching/pdf/x.pdf' | file_exists? }} -> true/false
    # Checks the SOURCE tree: "will this static file be copied to _site".
    def file_exists?(file_path)
      return false if file_path.nil? || file_path.to_s.empty?

      File.file?(source_path(file_path))
    end

    private

    def source_path(path)
      File.join(@context.registers[:site].source, path.to_s)
    end
  end
end

Liquid::Template.register_filter(Jekyll::DirExistsFilter)