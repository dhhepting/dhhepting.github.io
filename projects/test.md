---
---
# Assignments

<div class="accordion" id="accordionExample">
  <div class="table-responsive">
    <table class="table table-striped table-bordered">
      <thead>
        <tr class="d-flex bg-info">
          <th class="col-6 col-md-3">
            <span>Title</span>
          </th>
          <th class="d-none d-md-inline col-md-2">
            <span>Type</span>
          </th>
          <th class="d-none d-md-inline col-md-2">
            <span>Marks</span>
          </th>
          <th class="d-none d-md-inline col-md-2">
            <span>Due Date</span>
          </th>
          <th class="col-6 col-md-3">
            <span>URcourses</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr class="d-flex" id="{{ sdta.id }}">
          <td class="col-6 col-md-3">
            <button data-toggle="collapse" data-target="#collapse_{{sdta.id}}" class="accordion-toggle" role="button" aria-expanded="false" aria-controls="collapse_{{sdta.id}}">
              {{ sdta.title }}
            </button>
          </td>
          <td class="d-none d-md-inline col-2">
            <span>{{ sdta.type }}</span>
          </td>
          <td class="d-none d-md-inline col-2">
            <span>{{ sdta.marks }}</span>
          </td>
          <td class="d-none d-md-inline col-2">
            <span>{{ sdta.duedate }}</span>
          </td>
          <td class="col-6 col-md-3">
            <div class="btn-group my-1" role="group" aria-label="URcourses links">
              <a class="btn btn-primary mx-1" aria-label="Discuss"
              href="{{ sdta.lms_discuss }}"
              role="button" target="\_blank">
                Discuss
              </a>
            </div>
            <div class="btn-group my-1" role="group" aria-label="URcourses links">
              <a class="btn btn-primary mx-1" aria-label="Submit"
              href="{{ sdta.lms_submit }}"
              role="button" target="\_blank">
                Submit
              </a>
            </div>
          </td>
        </tr>
        <tr class="d-flex">
          <td class="col-12 accordian-body collapse" id="collapse_{{sdta.id}}" aria-labelledby="{{ sdta.id }}">
            {{ sa.content | markdownify }}
            Stuff
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
