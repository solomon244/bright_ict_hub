import Card from '../../components/common/Card';

const AboutPage = () => (
  <div className="mx-auto max-w-5xl space-y-12 px-4 py-12">
    <header className="space-y-4 text-center">
      <h1 className="section-heading">Rooted in Ethiopia, built for the world</h1>
      <p className="section-subheading mx-auto">
         Bright ICT Hub partners with schools, regional innovation labs, and diaspora engineers to co-design
        pathways that unlock the next generation of technologists.
      </p>
    </header>

    <section className="grid gap-6 md:grid-cols-3">
      {[
        { label: 'Mission', text: 'Equip secondary students with skills to build equitable technology products.' },
        { label: 'Vision', text: 'An Ethiopia where every learner can prototype ideas and launch ventures.' },
        {
          label: 'Values',
          text: 'Community, curiosity, cultural pride, and making technology relevant to local needs.',
        },
      ].map((item) => (
        <Card key={item.label} className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase text-primary">{item.label}</p>
          <p className="text-sm text-stone-600">{item.text}</p>
        </Card>
      ))}
    </section>

    <Card className="space-y-6">
      <h2 className="text-2xl font-display font-semibold text-stone-900">Partnership model</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-stone-600">Schools</p>
          <p className="text-sm text-stone-500">
            Teacher training, digital labs, and curriculum co-creation with ICT departments.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-600">Industry</p>
          <p className="text-sm text-stone-500">Internships, mentorships, and in-kind sponsorship from tech companies.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-600">Government</p>
          <p className="text-sm text-stone-500">Alignment with MOE digital strategy and regional innovation offices.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-600">Community</p>
          <p className="text-sm text-stone-500">Female-led maker circles, coding clubs, and Amharic-first documentation.</p>
        </div>
      </div>
    </Card>
  </div>
);

export default AboutPage;


