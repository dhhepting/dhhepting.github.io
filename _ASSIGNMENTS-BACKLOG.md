- [ ] Responses/feedback anchors (#ssR-*) ignored in _htmlproofer.yml pending section redesign — gate links+anchors on has_sresps properly then remove the ignore

## html-proofer: final 18 errors (triaged)
- [ ] Delete/retire cruft: aaa.html, OpenData/lod/old-index.html, projects/fractals/gallery/oldindex.html, sample/sample.html, teaching/CS-280/1_offweb/blog.html (~6 errors)
- [ ] Ignore /pagefind/ in _htmlproofer.yml (build-time search index, not present at proofer time) (3)
- [ ] _config.yml: set anchors.tlo to ssTopics (matches real emitted anchor) (2)
- [ ] Write file_exists? filter, gate syllabus link on it (3)
- [ ] Two one-offs: #ssAsgn_I02 anchor (CS-405+805/202510), moved research link in projects/games (2)

- [ ] _nonweb/ contains ~17 old archive files with special chars in names (en-dashes, non-breaking spaces, non-UTF-8 bytes). Harmless (excluded from build). Left as-is by choice. If ever a problem: lift _nonweb out to a tarball + gitignore, don't rename in place (risks breaking internal refs).
- [ ] Here's the honest strategic note, though, consistent with everything else this session: this is a redesign, not a quick fix. Consolidating three data sources into one, moving all rendering into the layout, generating BibTeX from fields, and normalizing project/title/bare-variable inconsistencies across every work file — that's a focused project, and it's the research sibling of the assignments reorganization you already backlogged. It's genuinely worth doing (it'll declutter exactly what's bugging you), but it's not upgrade-2026 work.
So: the answer to should I use _includes/research/work.html? is yes — move all rendering into the layout/include and reduce each work file to pure front-matter data, generating the BibTeX from fields rather than hand-writing it. That's the best-practice target. But given where you are, I'd log it as a research collection consolidation backlog item alongside the assignments one, fix only the outright bugs now if any are causing build/proofer errors (the bare {{ breadcrumb }}, the project/projects split, the mispasted 2006 content), and save the full rendering-consolidation for its own session. Want me to write the backlog entry capturing this target shape, or are any of these works currently erroring in the build such that they need immediate attention rather than deferral?
