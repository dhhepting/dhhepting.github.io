module Jekyll
  module DirExistsFilter
    def dir_exists?(dir_path)
      # Get the absolute path to your Jekyll source directory
      site_source = @context.registers[:site].config['source']
      full_path = File.join(site_source, dir_path)
      
      # Return true if the directory physically exists on the disk
      Dir.exist?(full_path)
    end
  end
end

Liquid::Template.register_filter(Jekyll::DirExistsFilter)
