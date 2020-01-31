---
title: Computer Science Seminars
breadcrumb: Computer Science Seminars
layout: bg-image
redirect_from:
- /teaching/CS-499+900/202010/Elham-Parhizkar-Abyaneh.html
presenter: Elham Parhizkar Abyaneh
supervisor: Sandra Zilles
semtitle: Indirect Trust is Simple to Establish
abstract: In systems with multiple potentially deceptive agents, any single agent may have to assess the trustworthiness of other agents in order to decide with which agents to interact. In this context, indirect trust refers to trust established through third-party advice. Since the advisers themselves may be deceptive, agents need a mechanism to assess advice. We evaluate existing methods for computing indirect trust, demonstrating that the best ones tend to be of prohibitively large complexity. We propose a new method for computing indirect trust, based on a simple prediction with expert advice strategy as is often used in online learning. This method either competes with or outperforms all tested systems in the vast majority of the settings we simulated, while scaling substantially better.
---
<div class="card text-center">
  <h3 class="card-header">
    {{ page.semtitle }}
  </h3>
  <div class="card-body">
    <h5>Presenter: {{ page.presenter }}</h5>
    {%- if page.supervisor -%}
      <h7>Supervisor: {{ page.supervisor }}</h7>
    {%- endif -%}
    <p></p>
    <h7>Date and Time: 24 Jan 2020, 09:30</h7><br />
    <h7>Location: Classroom Building 317, University of Regina</h7>
    <p></p>
    <p class="text-justify">{{ page.abstract }}</p>
  </div>
</div>
