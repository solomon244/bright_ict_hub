import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';

const ContactPage = () => {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-12">
      <div className="text-center">
        <h1 className="section-heading">Contact the Ethio Tech Hub team</h1>
        <p className="section-subheading mx-auto">
          Share partnership inquiries, volunteer interest, or press requests and we will respond within two business
          days.
        </p>
      </div>
      <form className="glass-panel space-y-6 rounded-3xl p-8">
        <div className="grid gap-6 md:grid-cols-2">
          <InputField label="Full name" placeholder="e.g. Hana Alemu" required />
          <InputField label="Email" type="email" placeholder="you@example.com" required />
          <InputField label="Organization" placeholder="School or company" />
          <InputField label="Phone" type="tel" placeholder="+251 9 123 4567" />
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-600">How can we help?</span>
          <textarea
            className="min-h-[160px] w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            placeholder="Tell us about your idea..."
          />
        </label>
        <Button type="submit" className="w-full py-3 text-base">
          Send message
        </Button>
      </form>
    </div>
  );
};

export default ContactPage;


