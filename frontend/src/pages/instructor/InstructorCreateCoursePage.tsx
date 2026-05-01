import { useState, useEffect, useMemo, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import InputField from '../../components/common/InputField';
import SelectField from '../../components/common/SelectField';
import Button from '../../components/common/Button';
import { createCourse, uploadCourseThumbnail, type CreateCoursePayload } from '../../services/courseService';
import { fetchCategories } from '../../services/categoryService';
import { useAuth } from '../../hooks/useAuth';
import type { Category } from '../../types';

const InstructorCreateCoursePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCoursePayload & { language?: string; thumbnailUrl?: string }>({
    title: '',
    description: '',
    category: '',
    level: 'beginner',
    language: 'English',
    price: 0,
    thumbnailUrl: '',
    requirements: [],
    outcomes: [],
    tags: [],
  });
  const [requirementsText, setRequirementsText] = useState('');
  const [outcomesText, setOutcomesText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await fetchCategories();
        // Normalize category data to ensure IDs are accessible
        const normalizedCategories = data.map((cat: any) => ({
          ...cat,
          _id: cat._id || cat.id,
          id: cat.id || cat._id,
        }));
        setCategories(normalizedCategories);
        if (normalizedCategories.length === 0) {
          console.warn('No categories found in database');
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load categories: ${errorMessage}. Please refresh the page or contact support.`);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleThumbnailFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setThumbnailFile(file);
    if (file) {
      setThumbnailPreview(URL.createObjectURL(file));
      setFormData((prev) => ({ ...prev, thumbnailUrl: '' }));
    } else {
      setThumbnailPreview('');
    }
  };

  useEffect(() => {
    return () => {
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Course title is required');
      }
      if (!formData.description.trim()) {
        throw new Error('Course description is required');
      }
      
      // Validate category - must be a non-empty string
      const categoryValue = (formData.category || '').trim();
      if (!categoryValue) {
        throw new Error('Please select a category');
      }

      // Parse arrays from text inputs
      const requirements = requirementsText
        .split('\n')
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
      const outcomes = outcomesText
        .split('\n')
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
      const tags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Prepare payload - use the validated category value
      // Only include optional fields if they have values
      const payload: CreateCoursePayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: categoryValue,
      };

      // Add optional fields only if they have valid values
      if (formData.level && ['beginner', 'intermediate', 'advanced'].includes(formData.level)) {
        payload.level = formData.level as 'beginner' | 'intermediate' | 'advanced';
      }

      if (formData.price && Number(formData.price) >= 0) {
        payload.price = Number(formData.price);
      }

      if (formData.language?.trim()) {
        payload.language = formData.language.trim();
      }

      if (formData.thumbnailUrl?.trim()) {
        payload.thumbnailUrl = formData.thumbnailUrl.trim();
      }

      if (requirements.length > 0) {
        payload.requirements = requirements;
      }

      if (outcomes.length > 0) {
        payload.outcomes = outcomes;
      }

      if (tags.length > 0) {
        payload.tags = tags;
      }

      // Create course first, then upload thumbnail file if selected.
      const createdCourse = await createCourse(payload);
      const createdCourseId = createdCourse._id || createdCourse.id;

      if (thumbnailFile && createdCourseId) {
        await uploadCourseThumbnail(createdCourseId, thumbnailFile);
      }

      // Navigate to course edit page or courses list
      navigate(`/instructor/courses`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
      console.error('Failed to create course:', err);
    } finally {
      setLoading(false);
    }
  };

  // Map categories to options, filtering out any without valid IDs
  // Use useMemo to prevent unnecessary recalculations
  const categoryOptions = useMemo(() => {
    if (!categories || categories.length === 0) {
      return [];
    }
    return categories
      .filter((cat) => {
        const id = (cat as any)._id || cat.id;
        return id && typeof id === 'string' && id.length > 0;
      })
      .map((cat) => {
        const id = (cat as any)._id || cat.id || '';
        return {
          label: cat.name || 'Unnamed Category',
          value: String(id),
        };
      });
  }, [categories]);

  const levelOptions = [
    { label: 'Beginner', value: 'beginner' },
    { label: 'Intermediate', value: 'intermediate' },
    { label: 'Advanced', value: 'advanced' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <InputField
          label="Course title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Full-Stack Engineering Studio"
          required
          disabled={loading}
        />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-600">Category</label>
          {categoriesLoading ? (
            <div className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
              Loading categories...
            </div>
          ) : categoryOptions.length === 0 ? (
            <div className="space-y-3">
              <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold mb-1">No categories available</p>
                <p className="text-xs text-amber-700">
                  Categories must be created before you can create courses.
                </p>
              </div>
              {user?.role === 'admin' ? (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" asChild className="text-sm">
                    <Link to="/admin/categories">Create Categories</Link>
                  </Button>
                  <span className="text-xs text-stone-500">or</span>
                  <Button 
                    variant="ghost" 
                    onClick={() => window.location.reload()} 
                    className="text-sm"
                  >
                    Refresh
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-stone-500">
                  Please contact an administrator to create categories, or log in as an admin to create them yourself.
                </p>
              )}
            </div>
          ) : (
            <SelectField
              label=""
              name="category"
              value={formData.category || ''}
              onChange={handleChange}
              options={[
                { 
                  label: 'Select a category', 
                  value: '' 
                },
                ...categoryOptions,
              ]}
              required
              disabled={loading}
            />
          )}
        </div>
        <SelectField
          label="Level"
          name="level"
          value={formData.level || 'beginner'}
          onChange={handleChange}
          options={levelOptions}
          disabled={loading}
        />
        <InputField
          label="Language"
          name="language"
          value={formData.language || ''}
          onChange={handleChange}
          placeholder="English & Amharic"
          disabled={loading}
        />
        <InputField
          label="Price (ETB)"
          name="price"
          type="number"
          value={formData.price || 0}
          onChange={handleChange}
          placeholder="0"
          min="0"
          step="0.01"
          disabled={loading}
        />
        <InputField
          label="Thumbnail URL"
          name="thumbnailUrl"
          value={formData.thumbnailUrl || ''}
          onChange={handleChange}
          placeholder="https://images..."
          type="url"
          disabled={loading || Boolean(thumbnailFile)}
          helperText={thumbnailFile ? 'Using uploaded image. Remove file to use URL.' : 'Paste image URL or upload image below.'}
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-600">Thumbnail image upload</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleThumbnailFileChange}
            disabled={loading}
            className="block w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
          />
          <p className="text-xs text-stone-400">Accepted: jpg, jpeg, png, gif, webp (max 5MB)</p>
        </label>
      </div>
      {(thumbnailPreview || formData.thumbnailUrl) && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-600">Thumbnail preview</p>
          <div className="max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
            <img
              src={thumbnailPreview || formData.thumbnailUrl}
              alt="Course thumbnail preview"
              className="h-48 w-full object-cover"
            />
          </div>
        </div>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-600">Course description</span>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          className="min-h-[160px] w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          placeholder="Outline the learning outcomes, key projects, and resources..."
          required
          disabled={loading}
        />
      </label>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-600">Requirements (one per line)</span>
          <textarea
            value={requirementsText}
            onChange={(e) => setRequirementsText(e.target.value)}
            className="min-h-[100px] w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            placeholder="Basic HTML knowledge&#10;Familiarity with CSS&#10;JavaScript fundamentals"
            disabled={loading}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-600">Learning Outcomes (one per line)</span>
          <textarea
            value={outcomesText}
            onChange={(e) => setOutcomesText(e.target.value)}
            className="min-h-[100px] w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            placeholder="Build responsive web applications&#10;Understand React fundamentals&#10;Deploy applications to production"
            disabled={loading}
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-600">Tags (comma-separated)</span>
        <InputField
          label="Tags"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="react, javascript, web-development"
          disabled={loading}
        />
      </label>

      <div className="flex gap-4">
        <Button type="submit" className="px-6 py-3" disabled={loading}>
          {loading ? 'Creating...' : 'Create Course'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/instructor/courses')}
          className="px-6 py-3"
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default InstructorCreateCoursePage;


