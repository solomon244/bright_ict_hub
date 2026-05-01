import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';

const AdminSettingsPage = () => {
  return (
    <form className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <InputField label="Platform email" type="email" defaultValue="hello@ethio.tech" />
        <InputField label="Support phone" defaultValue="+251 11 123 4567" />
      </div>
      <InputField label="Client URL" defaultValue="http://localhost:5173" />
      <InputField label="API URL" defaultValue="http://localhost:5000/api" />
      <Button type="submit" className="px-6 py-3">
        Save settings
      </Button>
    </form>
  );
};

export default AdminSettingsPage;


