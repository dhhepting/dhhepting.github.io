# frozen_string_literal: true
#
# _plugins/featured_offerings_generator.rb
#
# PURPOSE
#   Decide, at BUILD TIME, which semester(s) to feature on the teaching landing
#   page — the current (in-session) term and the upcoming term — instead of
#   doing it in the visitor's browser with JavaScript, and instead of scraping
#   site.pages URLs in Liquid. One clock (the build clock, fixed at Regina
#   -06:00), one answer for everyone, and every link is a real static file that
#   html-proofer can check.
#
# NO NEW AUTHORED FIELDS. It reuses the dates already in semesters.yml
# (term_start / term_end), the single validated source.
#
# READS  (all already in memory by the time this runs)
#   site.data['teaching']['offerings']        <- flat list from
#       OfferingsIndexGenerator (:highest); each item has 'id' + 'semester'.
#       Offering-directory presence is our "confirmed target" guarantee, so
#       featured LINKS come from here, never from a semester's classes_taught:.
#   site.data['teaching']['all']['courses']   <- key 'id', plus 'name'
#   site.data['teaching']['all']['semesters'] <- keys 'semester', 'term_start'
#       (required), 'term_end' (optional). semester_generator.rb also injects
#       'year'/'semester_name' onto these hashes; we keep references to the
#       originals so those are visible to templates.
#
# WRITES  (all DERIVED — nothing here is hand-authored)
#   site.data['teaching']['all']['current_term']     -> latest-STARTED semester
#   site.data['teaching']['all']['in_session_term']  -> that term IFF today is
#                                                        on/before term_end (nil
#                                                        between terms)
#   site.data['teaching']['all']['upcoming_term']    -> next term to START (nil)
#   site.data['teaching']['all']['featured_terms']   -> ordered Array, ready to
#       render: [{ 'code','kind'('current'|'upcoming'),'term'(orig hash),
#                  'offerings':[{'id','name'}] }]. Only terms that actually have
#       offerings are included, so the card never shows an empty section.
#   course['featured_semesters']  -> Array<String> current/next codes for a course
#   course['all_semesters']       -> Array<String> every code, newest first
#
# Runs :low so OfferingsIndexGenerator (:highest) has populated offerings.

require 'date'

module Teaching
  class FeaturedOfferingsGenerator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      teaching = site.data['teaching']
      return unless teaching

      all       = teaching['all'] || {}
      semesters = Array(all['semesters'])
      courses   = Array(all['courses'])
      offerings = Array(teaching['offerings'])
      return if semesters.empty? || courses.empty?

      today = Date.today # build clock == Regina -06:00 (no DST here)
      terms = select_terms(semesters, today)

      all['current_term']    = terms[:current]
      all['in_session_term'] = terms[:in_session]
      all['upcoming_term']   = terms[:upcoming]

      # --- indexes used below ---------------------------------------------
      name_by_id = courses.each_with_object({}) { |c, h| h[code(c['id'])] = c['name'] }
      by_course  = Hash.new { |h, k| h[k] = [] }
      by_sem     = Hash.new { |h, k| h[k] = [] }
      offerings.each do |o|
        by_course[code(o['id'])]       << code(o['semester'])
        by_sem[code(o['semester'])]    << o
      end
      by_course.each_value { |codes| codes.replace(codes.uniq.sort.reverse) }

      # --- featured_terms: current (in-session) then upcoming -------------
      featured = []
      [[terms[:in_session], 'current'], [terms[:upcoming], 'upcoming']].each do |term, kind|
        next unless term
        c = code(term['semester'])
        offs = by_sem[c].map { |o| { 'id' => code(o['id']), 'name' => name_by_id[code(o['id'])] } }
                        .uniq { |x| x['id'] }
                        .sort_by { |x| x['id'] }
        next if offs.empty? # never feature a term with nothing to link to
        featured << { 'code' => c, 'kind' => kind, 'term' => term, 'offerings' => offs }
      end
      all['featured_terms'] = featured

      # --- per-course injections -----------------------------------------
      courses.each do |course|
        mine = by_course[code(course['id'])]
        course['all_semesters']      = mine
        course['featured_semesters'] = featured_for(mine, terms)
      end
    end

    private

    # YAML may load 202630 as an Integer; directory names are the String
    # "202630". Comparing the two silently fails. Coerce at EVERY boundary.
    def code(value) = value.to_s
    def to_date(value) = value.is_a?(Date) ? value : Date.parse(value.to_s)

    def select_terms(semesters, today)
      dated = semesters.map { |s|
        { orig: s, starts: require_term_start(s),
          ends: (s['term_end'] && to_date(s['term_end'])) }
      }.sort_by { |d| d[:starts] }

      current = dated.select { |d| d[:starts] <= today }.last
      in_session = current if current && (current[:ends].nil? || today <= current[:ends])
      upcoming = dated.find { |d| d[:starts] > today }

      { current: current&.dig(:orig),
        in_session: in_session&.dig(:orig),
        upcoming: upcoming&.dig(:orig) }
    end

    def featured_for(mine, terms)
      return [] if mine.empty?
      cur = terms[:in_session] && code(terms[:in_session]['semester'])
      nxt = terms[:upcoming]   && code(terms[:upcoming]['semester'])
      picked = [cur, nxt].compact.select { |c| mine.include?(c) }.uniq
      picked = [mine.first] if picked.empty? # mine is sorted desc -> newest term
      picked.sort.reverse
    end

    def require_term_start(semester)
      unless semester['term_start']
        raise "Semester #{code(semester['semester']).inspect} is missing a " \
              "'term_start:' date in semesters.yml — it can't be ordered without one."
      end
      to_date(semester['term_start'])
    end
  end
end