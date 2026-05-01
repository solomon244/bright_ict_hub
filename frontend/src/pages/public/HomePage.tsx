import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaClock,
  FaLanguage,
  FaPlayCircle,
  FaWifi,
  FaRegCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaShieldAlt,
  FaDownload,
  FaRobot,
  FaCheckCircle,
  FaUserGraduate,
} from 'react-icons/fa';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { fetchCourses } from '../../services/courseService';
import type { Course } from '../../types';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

const categoryOrder = ['Python Basics', 'AI for Beginners', 'Web Dev', 'Digital Literacy', 'Exam Prep'];

const HomePage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<'en' | 'am'>('en');
  const [showGuardianDetails, setShowGuardianDetails] = useState(false);
  const [dataSaver, setDataSaver] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = await fetchCourses({ isPublished: true });
        setCourses(data.slice(0, 5));
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('site-lang');
    if (saved === 'en' || saved === 'am') {
      setLanguage(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('site-lang', language);
  }, [language]);

  const heroContent = {
    en: {
      label: 'AI-powered learning for Ethiopian teens',
      heading: 'Learn AI & Coding - Made for Ethiopian Students',
      subheading: 'Interactive lessons. AI tutor support. Learn on any phone.',
      primaryCta: 'Start Free Lesson',
      secondaryCta: 'Watch Demo (2 min)',
      trustA: 'Used by 10,000+ students',
      trustB: 'Aligned with Ethiopian Curriculum',
      trustC: 'Works Offline',
      progress: '80% of students finish their first lesson in under 10 minutes',
    },
    am: {
      label: 'ለኢትዮጵያ ወጣቶች የተዘጋጀ AI ትምህርት',
      heading: 'AI እና ኮዲንግ ይማሩ - ለኢትዮጵያ ተማሪዎች ተስማሚ',
      subheading: 'ተግባራዊ ትምህርቶች፣ የAI አስተማሪ ድጋፍ፣ በማንኛውም ስልክ ይማሩ።',
      primaryCta: 'ነፃ ትምህርት ጀምር',
      secondaryCta: 'ዴሞ ቪዲዮ ይመልከቱ (2 ደቂቃ)',
      trustA: 'ከ10,000+ ተማሪዎች ጋር ተጠቃሚ',
      trustB: 'ከኢትዮጵያ ስርዓተ ትምህርት ጋር የተጣጣመ',
      trustC: 'ከኢንተርኔት ውጭ ይሰራል',
      progress: '80% ተማሪዎች የመጀመሪያ ትምህርታቸውን በ10 ደቂቃ ውስጥ ያጠናቅቃሉ',
    },
  } as const;

  const valueCards = [
    {
      title: language === 'am' ? 'የAI አስተማሪ' : 'AI-Powered Tutor',
      description:
        language === 'am'
          ? 'በአማርኛ ወይም በእንግሊዝኛ ፈጣን እገዛ ያግኙ።'
          : 'Get instant help in Amharic or English.',
      icon: <FaRobot className="text-primary text-xl" />,
    },
    {
      title: language === 'am' ? 'በማንኛውም ቦታ ተማር' : 'Learn Anywhere',
      description:
        language === 'am'
          ? 'ትምህርቶችን ያውርዱ እና ከኢንተርኔት ውጭ ይማሩ።'
          : 'Download lessons for offline use.',
      icon: <FaDownload className="text-primary text-xl" />,
    },
    {
      title: language === 'am' ? 'እውነተኛ ፕሮጀክቶች' : 'Real Projects',
      description:
        language === 'am'
          ? 'አፕ፣ ጨዋታ እና AI ሞዴሎች ይገንቡ።'
          : 'Build apps, games, and AI models that matter.',
      icon: <FaCheckCircle className="text-primary text-xl" />,
    },
  ];

  const sortedCourses = useMemo(() => {
    const getCategory = (course: Course) =>
      typeof course.category === 'object' ? course.category.name : String(course.category ?? '');
    return [...courses].sort((a, b) => {
      const indexA = categoryOrder.findIndex((name) => getCategory(a).toLowerCase().includes(name.toLowerCase()));
      const indexB = categoryOrder.findIndex((name) => getCategory(b).toLowerCase().includes(name.toLowerCase()));
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }, [courses]);

  return (
    <div className="space-y-16 py-8 pb-28 md:space-y-20 md:py-12 md:pb-12">
      <section className="relative mx-auto max-w-6xl px-4 animate-show">
        <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-primary/15 bg-white px-4 py-3 shadow-sm">
              <img src="/bright-logo.png" alt="Bright ICT Hub logo" className="h-10 w-auto object-contain" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Bright ICT Hub</p>
                <p className="text-xs text-stone-500">AI, coding, and digital skills for Ethiopian students</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="info" className="w-fit normal-case">
                {heroContent[language].label}
              </Badge>
              <button
                type="button"
                onClick={() => setLanguage((prev) => (prev === 'en' ? 'am' : 'en'))}
                className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
                aria-label="Toggle homepage language"
              >
                <FaLanguage />
                {language === 'en' ? 'አማርኛ' : 'English'}
              </button>
              <button
                type="button"
                onClick={() => setDataSaver((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                aria-label="Toggle data saver mode"
              >
                <FaWifi className={dataSaver ? 'text-success' : 'text-stone-400'} />
                {dataSaver ? 'Data Saver: On' : 'Data Saver: Off'}
              </button>
            </div>
            <h1 className="section-heading text-4xl leading-tight md:text-5xl lg:text-6xl">{heroContent[language].heading}</h1>
            <p className="section-subheading max-w-2xl text-lg lg:text-xl">{heroContent[language].subheading}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild size="lg" className="px-7">
                <Link to="/register">
                  {heroContent[language].primaryCta} <FaArrowRight />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="px-7">
                <Link to="/courses">
                  <FaPlayCircle /> {heroContent[language].secondaryCta}
                </Link>
              </Button>
            </div>
            <div className="grid gap-2 pt-3 sm:grid-cols-3">
              {[heroContent[language].trustA, heroContent[language].trustB, heroContent[language].trustC].map((item) => (
                <p
                  key={item}
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600"
                >
                  <FaRegCheckCircle className="text-success" />
                  {item}
                </p>
              ))}
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span>{heroContent[language].progress}</span>
                <span>80%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-primary/10">
                <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-primary to-success" />
              </div>
            </div>
          </div>

          <Card className="space-y-5 overflow-hidden bg-gradient-to-br from-primary/15 via-white to-secondary/10 animate-show-delay-1">
            <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-white p-6">
              <img
                src="/bright-logo.png"
                alt="Bright ICT Hub logo"
                className="mx-auto h-72 w-auto object-contain smooth-transition hover:scale-105"
              />
              <div className="absolute bottom-4 left-4">
                <Badge variant="secondary" className="bg-white/95 text-primary shadow-sm">
                  {dataSaver ? 'Low-data video preview enabled' : 'HD preview enabled'}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-display font-semibold text-stone-900">
                {language === 'am' ? 'ከ0 ጀምሮ ቻትቦት ለመገንባት 4 ሳምንት' : 'From zero to building a chatbot in 4 weeks'}
              </h3>
              <p className="text-sm leading-relaxed text-stone-600">
                {language === 'am'
                  ? 'አጭር ትምህርቶች፣ የAI እገዛ እና የፕሮጀክት ልምምድ በአንድ ቦታ።'
                  : 'Bite-sized lessons, AI tutor support, and real projects in one mobile-friendly flow.'}
              </p>
            </div>
            <div className="grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
              <p className="inline-flex items-center gap-2">
                <FaCheckCircle className="text-success" /> Amharic and English support
              </p>
              <p className="inline-flex items-center gap-2">
                <FaCheckCircle className="text-success" /> Low-bandwidth mode
              </p>
              <p className="inline-flex items-center gap-2">
                <FaCheckCircle className="text-success" /> Skill pathways by level
              </p>
              <p className="inline-flex items-center gap-2">
                <FaCheckCircle className="text-success" /> Certificate milestones
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 animate-show-delay-1">
        <Card className="border border-primary/10 bg-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Partners & trust signals</p>
              <p className="mt-1 text-sm text-stone-500">Aligned with schools, curriculum goals, and local learning contexts.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['MoE-aligned', 'School Partners', 'Tech NGOs', 'Parent Approved'].map((partner) => (
                <Badge key={partner} variant="secondary" className="normal-case">
                  {partner}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 animate-show-delay-2">
        <div className="mb-8 text-center">
          <h2 className="section-heading">Why students choose Bright ICT Hub</h2>
          <p className="section-subheading mx-auto max-w-2xl">
            Built for Ethiopian students with localized examples, AI support, and offline-friendly access.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {valueCards.map((item) => (
            <Card
              key={item.title}
              className="group h-full border border-stone-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-show"
            >
              <div className="space-y-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">{item.icon}</span>
                <h3 className="text-xl font-display font-semibold text-stone-900">{item.title}</h3>
                <p className="text-sm leading-relaxed text-stone-500">{item.description}</p>
                <Link to="/courses" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark">
                  Free preview <FaArrowRight className="text-xs" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 animate-show">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex-1 text-center">
            <h2 className="section-heading">Course preview</h2>
            <p className="section-subheading mx-auto max-w-2xl">
              Python Basics, AI for Beginners, Web Dev, Digital Literacy, and Exam Prep.
            </p>
          </div>
          {courses.length > 0 && (
            <Button asChild variant="secondary" className="ml-4 hidden lg:flex">
              <Link to="/courses">View all</Link>
            </Button>
          )}
        </div>
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="space-y-4 animate-pulse">
                <div className="h-48 w-full rounded-2xl bg-stone-200" />
                <div className="h-4 w-3/4 rounded bg-stone-200" />
                <div className="h-4 w-full rounded bg-stone-200" />
                <div className="h-4 w-2/3 rounded bg-stone-200" />
              </Card>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card className="py-16 text-center">
            <div className="space-y-4">
              <p className="text-lg text-stone-500">No featured courses available yet.</p>
              <p className="text-sm text-stone-400">Check back soon for new programs.</p>
              <Button asChild variant="secondary" className="mt-4">
                <Link to="/courses">Browse all courses</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {sortedCourses.map((course) => {
                const categoryName = typeof course.category === 'object' ? course.category.name : course.category;
                const courseId = course._id || course.id;

                return (
                  <Card
                    key={courseId}
                    className="group space-y-4 overflow-hidden border border-stone-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative overflow-hidden rounded-2xl">
                      <img
                        src={resolveMediaUrl(course.thumbnailUrl) || '/placeholder-course.jpg'}
                        alt={course.title}
                        loading="lazy"
                        className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute left-3 top-3">
                        <Badge variant="info" className="bg-white/90 text-primary backdrop-blur-sm">
                          Free Preview
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="info" className="text-xs">
                          {categoryName}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {course.level}
                        </Badge>
                      </div>

                      <h3 className="line-clamp-2 text-xl font-display font-semibold text-stone-900 transition-colors group-hover:text-primary">
                        {course.title}
                      </h3>

                      <div className="border-t border-stone-100 pt-2 text-xs text-stone-500">
                        <div className="flex items-center gap-4">
                          {course.totalLessons && (
                            <p className="inline-flex items-center gap-1">
                              <FaUserGraduate className="text-primary" />
                              {course.totalLessons} lessons
                            </p>
                          )}
                          {course.totalDuration && (
                            <p className="inline-flex items-center gap-1">
                              <FaClock className="text-primary" />
                              {course.totalDuration}h
                            </p>
                          )}
                          <p className="inline-flex items-center gap-1">
                            <FaDownload className="text-success" />
                            Offline
                          </p>
                        </div>
                      </div>

                      <Button asChild variant="primary" className="mt-4 w-full transition-colors group-hover:bg-primary/90">
                        <Link to={`/courses/${courseId}`}>
                          Free Preview <FaArrowRight className="ml-2 inline" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="mt-8 text-center lg:hidden">
              <Button asChild variant="secondary" size="lg">
                <Link to="/courses">View all programs</Link>
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="bg-gradient-to-b from-stone-50 to-white py-16 animate-show-delay-1">
        <div id="how-it-works" className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="section-heading">How it works</h2>
            <p className="section-subheading mx-auto max-w-2xl">
              Sign up quickly, pick your path, and learn with guided AI support.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: '01', title: 'Sign up in 30 seconds', description: 'Create your account and start a free lesson immediately.' },
              { step: '02', title: 'Pick a path', description: 'Choose Coding, AI, or Digital Skills based on your level.' },
              { step: '03', title: 'Learn and earn certificates', description: 'Study with AI tutor support and track your achievements.' },
            ].map((step, index, arr) => (
              <div key={step.step} className="relative">
                <Card className="h-full space-y-4 text-center transition-shadow hover:shadow-lg">
                  <p className="mx-auto w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Step {step.step}</p>
                  <h3 className="text-lg font-semibold text-stone-900">{step.title}</h3>
                  <p className="text-sm text-stone-500">{step.description}</p>
                </Card>
                {index < arr.length - 1 && (
                  <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 transform lg:block">
                    <FaArrowRight className="text-2xl text-primary/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="success-stories" className="mx-auto max-w-6xl px-4 animate-show-delay-2">
        <div className="mb-12 text-center">
          <h2 className="section-heading">Success stories</h2>
          <p className="section-subheading mx-auto max-w-2xl">Voices from students, schools, and communities.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { name: 'Meron A.', school: 'Hawassa Secondary School', content: 'I built my first Amharic chatbot in 4 weeks.' },
            { name: 'Yosef T.', school: 'Addis Ababa STEM School', content: 'The offline lessons helped me learn even with unstable internet.' },
            { name: 'Mahi K.', school: 'Bahir Dar Preparatory', content: 'The AI tutor explains concepts in simple language and examples.' },
          ].map((testimonial) => (
            <Card key={testimonial.name} className="space-y-4 border border-stone-100">
              <div className="h-40 overflow-hidden rounded-xl bg-stone-100">
                <img
                  src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=70"
                  alt={`${testimonial.name} student story`}
                  loading="lazy"
                  className="h-full w-full object-cover smooth-transition hover:scale-105"
                />
              </div>
              <p className="text-sm italic leading-relaxed text-stone-600">"{testimonial.content}"</p>
              <div className="border-t border-stone-100 pt-4">
                <p className="font-semibold text-stone-900">{testimonial.name}</p>
                <p className="text-xs text-stone-500">{testimonial.school}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 animate-show">
        <Card className="border border-stone-200 bg-white">
          <button
            type="button"
            onClick={() => setShowGuardianDetails((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={showGuardianDetails}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">For Grown-ups</p>
              <h3 className="mt-1 text-xl font-display font-semibold text-stone-900">Parent & Teacher Corner</h3>
            </div>
            {showGuardianDetails ? <FaChevronUp className="text-primary" /> : <FaChevronDown className="text-primary" />}
          </button>
          {showGuardianDetails && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600">
                <FaShieldAlt className="mr-2 inline text-primary" />
                Safety-first learning environment, moderated community interactions, and parental controls.
              </p>
              <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600">
                <FaRegCheckCircle className="mr-2 inline text-success" />
                Progress dashboards, affordable pricing tiers, and school partnership support.
              </p>
            </div>
          )}
        </Card>
      </section>

      <section className="mx-auto max-w-6xl rounded-3xl bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 px-8 py-16 animate-show-delay-1">
        <div className="space-y-6 text-center">
          <h2 className="text-3xl font-display font-semibold text-stone-900 lg:text-4xl">Ready to Build Your Future?</h2>
          <p className="mx-auto max-w-2xl text-lg text-stone-600">
            Join thousands of Ethiopian students learning tech - free to start.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button asChild size="lg" className="px-8 py-4 text-base shadow-lg">
              <Link to="/register">Create Free Account</Link>
            </Button>
          </div>
          <p className="text-xs font-medium text-stone-500">No credit card - Works on basic smartphones</p>
        </div>
      </section>
      <div className="fixed bottom-3 left-3 right-3 z-40 rounded-2xl border border-primary/20 bg-white/95 p-3 shadow-2xl backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-stone-600">
            {language === 'am' ? 'ነፃ ትምህርት ይጀምሩ' : 'Start a free lesson now'}
          </p>
          <Button asChild size="sm" className="whitespace-nowrap">
            <Link to="/register">{language === 'am' ? 'ነፃ ጀምር' : 'Start Free'}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;


