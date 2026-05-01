import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import { 
  fetchCategories, 
  createCategory, 
  deleteCategory,
  type CreateCategoryPayload 
} from '../../services/categoryService';
import type { Category } from '../../types';

const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCategoryPayload>({
    name: '',
    description: '',
    icon: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      if (!formData.name.trim()) {
        throw new Error('Category name is required');
      }

      await createCategory({
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        icon: formData.icon?.trim() || undefined,
      });

      // Reset form
      setFormData({ name: '', description: '', icon: '' });
      
      // Reload categories
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
      console.error('Failed to create category:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      await deleteCategory(categoryId);
      // Reload categories
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      console.error('Failed to delete category:', err);
    }
  };

  const getCategoryId = (cat: Category): string => {
    return (cat as any)._id || cat.id || '';
  };

  if (loading) {
    return <div className="text-center">Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase text-primary">Existing categories</p>
          {categories.length === 0 ? (
            <p className="text-sm text-stone-500 py-4">No categories found. Create your first category below.</p>
          ) : (
            <ul className="space-y-3">
              {categories.map((category) => {
                const categoryId = getCategoryId(category);
                return (
                  <li key={categoryId} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                    <div className="flex-1">
                      <span className="font-semibold text-stone-800 block">{category.name}</span>
                      {category.description && (
                        <span className="text-xs text-stone-500 block mt-1">{category.description}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(categoryId, category.name)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase text-primary">Create category</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Cybersecurity"
              required
              disabled={creating}
            />
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-600">Description (optional)</span>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                className="min-h-[80px] w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                placeholder="Brief description of this category"
                disabled={creating}
              />
            </label>
            <InputField
              label="Icon (optional)"
              name="icon"
              value={formData.icon || ''}
              onChange={handleChange}
              placeholder="icon-name"
              disabled={creating}
            />
            <Button type="submit" disabled={creating} className="w-full">
              {creating ? 'Creating...' : 'Add category'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AdminCategoriesPage;


