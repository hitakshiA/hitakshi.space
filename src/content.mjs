// What shows up when a city opens. Logos live in public/assets/logos/<key>.<ext>.
// `bleed` logos fill their tile edge to edge; the rest sit on a white tile.
export const LOGOS = {
  srm: { file: 'srm.png' },
  nic: { file: 'nic.svg' },
  prodigal: { file: 'prodigal.svg' },
  hackerrank: { file: 'hackerrank.png', bleed: true },
  yc: { file: 'yc.svg', bleed: true },
};

export const CITIES = [
  {
    key: 'delhi', code: 'DEL', title: 'Delhi',
    rows: [
      { logo: 'srm', org: 'SRM Institute of Science and Technology', role: 'B.Tech CSE (Data Science).', when: '2023–2027' },
      { logo: 'nic', org: 'National Informatics Centre', role: 'Data Engineering Intern. Pipelines moving 4&nbsp;TB a&nbsp;day.', when: 'Jun–Aug 2025' },
    ],
  },
  {
    key: 'mumbai', code: 'BOM', title: 'Mumbai', sub: 'now',
    rows: [
      {
        logo: 'prodigal', org: 'Prodigal', yc: 'S18', role: 'Agent Engineer.', when: 'Jun–Dec 2026',
        points: [
          'Built and shipped three production voice agents for US financial&#8209;services clients, including debt&nbsp;collection.',
          'Turned customer requirements into agent workflows and connected them to client&nbsp;CRMs.',
          'Tuned flows, prompts and context against real call&nbsp;data.',
        ],
      },
    ],
  },
  {
    key: 'bangalore', code: 'BLR', title: 'Bangalore', sub: 'next',
    rows: [
      {
        logo: 'hackerrank', org: 'HackerRank', yc: 'S11', role: 'SDE Intern, upcoming in&nbsp;2027.', when: 'Jan 2027',
        points: [
          'Top 20 worldwide in HackerRank Orchestrate, four&nbsp;times.',
          'Cleared a rigorous national-level intern intake over four&nbsp;rounds.',
        ],
      },
    ],
  },
];
