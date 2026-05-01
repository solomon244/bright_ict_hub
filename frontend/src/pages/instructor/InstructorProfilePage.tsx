import { useEffect, useState, type FormEvent } from 'react';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { fetchProfile, updateProfile } from '../../services/userService';
import { useAuth } from '../../hooks/useAuth';

const InstructorProfilePage = () => {
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    specialization: '',
    experienceYears: '',
    linkedin: '',
    youtube: '',
    website: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const profile = await fetchProfile();
        
        setFormData({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          email: profile.email || '',
          bio: profile.bio || '',
          specialization: profile.skills?.join(', ') || '',
          experienceYears: profile.instructorProfile?.experienceYears?.toString() || '',
          linkedin: profile.socialLinks?.linkedin || '',
          youtube: profile.socialLinks?.youtube || '',
          website: profile.socialLinks?.website || '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      // Parse specialization (skills) from comma-separated string
      const skills = formData.specialization
        ? formData.specialization.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;

      // Prepare payload
      const payload: {
        firstName: string;
        lastName: string;
        bio?: string;
        skills?: string[];
        socialLinks?: {
          linkedin?: string;
          youtube?: string;
          website?: string;
        };
        instructorProfile?: {
          experienceYears?: number;
        };
      } = {
        firstName: formData.firstName,
        lastName: formData.lastName,
      };

      if (formData.bio) payload.bio = formData.bio;
      if (skills && skills.length > 0) payload.skills = skills;

      const socialLinks: { linkedin?: string; youtube?: string; website?: string } = {};
      if (formData.linkedin) socialLinks.linkedin = formData.linkedin;
      if (formData.youtube) socialLinks.youtube = formData.youtube;
      if (formData.website) socialLinks.website = formData.website;
      
      if (Object.keys(socialLinks).length > 0) {
        payload.socialLinks = socialLinks;
      }

      // Add instructor profile fields
      if (formData.experienceYears) {
        const experienceYears = parseInt(formData.experienceYears, 10);
        if (!isNaN(experienceYears) && experienceYears > 0) {
          payload.instructorProfile = {
            experienceYears,
          };
        }
      }

      await updateProfile(payload);
      // Refresh auth context with new user data
      await refreshProfile();

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="space-y-6">
        <div className="text-center py-12">Loading profile...</div>
      </Card>
    );
  }

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900 mb-2">Update Your Profile</h2>
        <p className="text-sm text-stone-500">
          Keep your profile information up to date to help students discover your expertise.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-600">
          Profile updated successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <InputField
            label="First name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="Selam"
            required
            disabled={saving}
          />
          <InputField
            label="Last name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Kebede"
            required
            disabled={saving}
          />
          <InputField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="selam@ethio.tech"
            disabled
            helperText="Email cannot be changed"
          />
          <InputField
            label="Years of experience"
            name="experienceYears"
            type="number"
            value={formData.experienceYears}
            onChange={handleChange}
            placeholder="5"
            min={1}
            max={40}
            disabled={saving}
            helperText="Number of years of professional experience"
          />
        </div>

        <InputField
          label="Specialization"
          name="specialization"
          value={formData.specialization}
          onChange={handleChange}
          placeholder="Frontend Engineering, UI Systems, React, JavaScript"
          disabled={saving}
          helperText="Separate multiple specializations with commas"
        />

        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-600">Instructor bio</span>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            className="min-h-[160px] w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:bg-stone-50 disabled:cursor-not-allowed"
            placeholder="Share your teaching philosophy, Ethiopian context projects, and mentorship highlights."
            disabled={saving}
          />
          <p className="text-xs text-stone-500">
            Describe your background, expertise, and what makes your teaching unique.
          </p>
        </label>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-stone-900">Social Links</h3>
          <div className="grid gap-6 md:grid-cols-3">
            <InputField
              label="LinkedIn"
              name="linkedin"
              type="url"
              value={formData.linkedin}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/yourprofile"
              disabled={saving}
            />
            <InputField
              label="YouTube"
              name="youtube"
              type="url"
              value={formData.youtube}
              onChange={handleChange}
              placeholder="https://youtube.com/@yourchannel"
              disabled={saving}
            />
            <InputField
              label="Website"
              name="website"
              type="url"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://yourwebsite.com"
              disabled={saving}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-stone-200">
          <p className="text-sm text-stone-500">
            Your profile information will be visible to students browsing courses.
          </p>
          <Button type="submit" className="px-6 py-3" disabled={saving}>
            {saving ? 'Updating...' : 'Update profile'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default InstructorProfilePage;


