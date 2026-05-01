import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';
import useAuth from '../../hooks/useAuth';

const StudentProfilePage = () => {
  const { user } = useAuth();

  return (
    <form className="space-y-6">
      <div className="flex items-center gap-6">
        <img
          src={user?.profileImage ?? 'https://i.pravatar.cc/150?img=60'}
          alt={user?.firstName}
          className="h-24 w-24 rounded-2xl object-cover"
        />
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Profile photo</p>
          <Button variant="secondary">Upload new</Button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <InputField label="First name" defaultValue={user?.firstName} />
        <InputField label="Last name" defaultValue={user?.lastName} />
        <InputField label="Email" type="email" defaultValue={user?.email} />
        <InputField label="Phone" placeholder="+251 9 123 4567" />
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-600">Bio</span>
        <textarea
          defaultValue={user?.bio}
          className="min-h-[140px] w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <Button type="submit" className="px-6 py-3">
        Save changes
      </Button>
    </form>
  );
};

export default StudentProfilePage;


