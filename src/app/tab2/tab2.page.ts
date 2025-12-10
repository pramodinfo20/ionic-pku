import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page implements OnInit {

  private readonly baseApi = `${window.location.protocol}//${window.location.hostname}`;
  private readonly apiUrl = `${this.baseApi}/pamuBlog/api/recipes.php`;
  private readonly uploadUrl = `${this.baseApi}/pamuBlog/api/upload.php`;

  recipes: Recipe[] = [];

  searchTerm = '';
  selectedCategory = 'all';
  activeExtras: string[] = [];
  isFormOpen = false;
  formMode: 'add' | 'edit' = 'add';
  formModel = this.createEmptyForm();
  formErrors: string[] = [];
  editingRecipeId: number | null = null;
  previewImage: string = '';
  selectedFile: File | null = null;
  detailOpen = false;
  activeRecipe: Recipe | null = null;

  categories = [
    { id: 'all', label: 'All' },
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'dinner', label: 'Dinner' },
    { id: 'dessert', label: 'Dessert' },
    { id: 'drinks', label: 'Drinks' },
    { id: 'snack', label: 'Snack' }
  ];

  extraFilters = [
    { id: 'vegetarian', label: 'Vegetarian', type: 'diet' },
    { id: 'non-vegetarian', label: 'Non-vegetarian', type: 'diet' },
    { id: 'indian', label: 'Indian', type: 'cuisine' },
    { id: 'italian', label: 'Italian', type: 'cuisine' },
    { id: 'asian', label: 'Asian', type: 'cuisine' }
  ];

  get filteredRecipes() {
    const term = this.searchTerm.trim().toLowerCase();
    return this.recipes.filter(recipe => {
      const matchesCategory =
        this.selectedCategory === 'all' ||
        recipe.category === this.selectedCategory ||
        (recipe.categories && recipe.categories.includes(this.selectedCategory));
      const matchesExtra =
        this.activeExtras.length === 0 ||
        this.activeExtras.every(extra => this.matchesExtraFilter(recipe, extra));
      const matchesText =
        !term ||
        recipe.title.toLowerCase().includes(term) ||
        (recipe.description || '').toLowerCase().includes(term) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(term));
      return matchesCategory && matchesExtra && matchesText;
    });
  }

  ngOnInit(): void {
    this.loadRecipes();
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail?.value || '';
  }

  onCategoryChange(event: any) {
    this.selectedCategory = event.detail?.value || 'all';
  }

  onExtraToggle(extraId: string, checked: boolean) {
    if (checked) {
      this.activeExtras = [...this.activeExtras, extraId];
    } else {
      this.activeExtras = this.activeExtras.filter(id => id !== extraId);
    }
  }

  isExtraActive(extraId: string): boolean {
    return this.activeExtras.includes(extraId);
  }

  matchesExtraFilter(recipe: Recipe, extraId: string): boolean {
    switch (extraId) {
      case 'vegetarian':
        return recipe.diet === 'vegetarian';
      case 'non-vegetarian':
        return recipe.diet === 'non-vegetarian';
      case 'indian':
        return recipe.cuisine === 'indian';
      case 'italian':
        return recipe.cuisine === 'italian';
      case 'asian':
        return recipe.cuisine === 'asian';
      default:
        return true;
    }
  }

  startEdit(recipe: Recipe) {
    this.formMode = 'edit';
    this.editingRecipeId = recipe.id ?? null;
    this.formModel = {
      title: recipe.title,
      description: recipe.description,
      categories: recipe.categories && recipe.categories.length ? [...recipe.categories] : [recipe.category],
      duration: recipe.duration,
      difficulty: recipe.difficulty,
      diet: recipe.diet,
      cuisine: recipe.cuisine,
      image: recipe.image || recipe.image_url || '',
      tags: recipe.tags.join(', '),
      steps: (recipe.steps || []).join('\n')
    };
    this.previewImage = recipe.image || recipe.image_url || '';
    this.formErrors = [];
    this.selectedFile = null;
    this.isFormOpen = true;
  }

  openAddModal() {
    this.formMode = 'add';
    this.editingRecipeId = null;
    this.formModel = this.createEmptyForm();
    this.previewImage = '';
    this.formErrors = [];
    this.selectedFile = null;
    this.isFormOpen = true;
  }

  closeFormModal() {
    this.isFormOpen = false;
    this.editingRecipeId = null;
    this.formModel = this.createEmptyForm();
    this.previewImage = '';
    this.formErrors = [];
    this.selectedFile = null;
  }

  async submitForm() {
    this.formErrors = this.validateForm();
    if (this.formErrors.length) {
      return;
    }

    const tags = this.formModel.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => !!tag);

    const steps = this.formModel.steps
      .split(/\r?\n/)
      .map(step => step.trim())
      .filter(step => !!step);

    let imageUrl = this.formModel.image || '';
    if (this.selectedFile) {
      try {
        const uploaded = await this.uploadImageIfNeeded(this.selectedFile);
        if (uploaded) {
          imageUrl = uploaded;
        }
      } catch (err) {
        this.handleHttpError(err);
        return;
      }
    } else if (this.previewImage && !this.previewImage.startsWith('data:')) {
      imageUrl = this.previewImage;
    }

    const payload: any = {
      title: this.formModel.title.trim(),
      description: this.formModel.description.trim(),
      category: this.formModel.categories[0] || 'dinner',
      categories: this.formModel.categories,
      duration: this.formModel.duration || 'N/A',
      difficulty: this.formModel.difficulty || 'Easy',
      diet: this.formModel.diet,
      cuisine: this.formModel.cuisine,
      image_url: this.normalizeImageUrl(imageUrl),
      tags,
      steps
    };

    if (this.formMode === 'add') {
      this.http.post<{ id: number }>(this.apiUrl, payload).subscribe({
        next: () => this.loadRecipes(),
        error: (err) => this.handleHttpError(err)
      });
    } else if (this.formMode === 'edit' && this.editingRecipeId !== null) {
      this.http.put(`${this.apiUrl}?id=${this.editingRecipeId}`, payload).subscribe({
        next: () => this.loadRecipes(),
        error: (err) => this.handleHttpError(err)
      });
    }

    this.closeFormModal();
  }

  onImageFileChange(event: any) {
    const file: File | null = event.target.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.previewImage = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async confirmDelete(recipe: Recipe) {
    const alert = await this.alertCtrl.create({
      header: 'Delete recipe?',
      message: `This will remove "${recipe.title}".`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.deleteRecipe(recipe.id)
        }
      ]
    });
    await alert.present();
  }

  openRecipe(recipe: Recipe) {
    this.activeRecipe = recipe;
    this.detailOpen = true;
  }

  closeRecipe() {
    this.activeRecipe = null;
    this.detailOpen = false;
  }

  private deleteRecipe(recipeId?: number) {
    if (!recipeId) return;
    this.http.delete(`${this.apiUrl}?id=${recipeId}`).subscribe({
      next: () => this.loadRecipes(),
      error: (err) => this.handleHttpError(err)
    });
  }

  private loadRecipes() {
    this.http.get<Recipe[]>(this.apiUrl).subscribe({
      next: (data) => {
        const mapped = (data || []).map(r => ({
          ...r,
          id: Number(r.id),
          title: r.title || 'Untitled',
          description: r.description || '',
          category: r.category || 'dinner',
          categories: Array.isArray((r as any).categories) ? (r as any).categories : [],
          duration: r.duration || 'N/A',
          difficulty: r.difficulty || 'Easy',
          diet: r.diet || 'vegetarian',
          cuisine: r.cuisine || '',
          image: this.normalizeImageUrl(r.image_url || r.image || ''),
          tags: Array.isArray(r.tags) ? r.tags : [],
          steps: Array.isArray((r as any).steps)
            ? (r as any).steps
            : typeof (r as any).steps === 'string'
              ? (r as any).steps.split(/\r?\n/).map((s: string) => s.trim()).filter((s: string) => !!s)
              : []
        }));
        this.recipes = mapped.length ? mapped : this.getSampleRecipes();
      },
      error: (err) => {
        this.handleHttpError(err);
        // Fallback to local sample data so UI is not empty while API is unreachable.
        this.recipes = this.getSampleRecipes();
      }
    });
  }

  private validateForm(): string[] {
    const errors: string[] = [];
    if (!this.formModel.title.trim()) {
      errors.push('Title is required.');
    }
    if (!this.formModel.categories || this.formModel.categories.length === 0) {
      errors.push('At least one category is required.');
    }
    const tagList = this.formModel.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => !!tag);
    if (tagList.length === 0) {
      errors.push('At least one tag is required.');
    }
    if (this.formModel.image && !this.isValidUrl(this.formModel.image)) {
      errors.push('Image URL looks invalid. Paste a full URL or upload an image.');
    }
    return errors;
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return !!parsed.protocol && !!parsed.host;
    } catch {
      return false;
    }
  }

  private createEmptyForm() {
    return {
      title: '',
      description: '',
      categories: ['dinner'],
      duration: '',
      difficulty: 'Easy',
      diet: 'vegetarian',
      cuisine: 'indian',
      image: '',
      tags: '',
      steps: ''
    };
  }

  private normalizeImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.baseApi}${url}`;
  }

  private async uploadImageIfNeeded(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append('image', file);
    const resp = await firstValueFrom(
      this.http.post<{ url: string }>(this.uploadUrl, formData)
    );
    return resp?.url || null;
  }

  private getSampleRecipes(): Recipe[] {
    return [
      {
        id: 1,
        title: 'Creamy Garlic Pasta',
        description: 'Silky parmesan garlic sauce tossed with al dente linguine and fresh herbs.',
        category: 'dinner',
        duration: '25 mins',
        difficulty: 'Easy',
        diet: 'vegetarian',
        cuisine: 'italian',
        image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80',
        tags: ['One-pot', 'Comfort'],
        steps: [
          'Cook linguine until al dente.',
          'Saute garlic in butter and olive oil.',
          'Add cream and parmesan, then toss pasta.',
          'Finish with herbs and pepper.'
        ]
      },
      {
        id: 2,
        title: 'Berry Yogurt Bowl',
        description: 'Greek yogurt topped with fresh berries, toasted oats, and honey.',
        category: 'breakfast',
        duration: '10 mins',
        difficulty: 'Easy',
        diet: 'vegetarian',
        cuisine: 'indian',
        image: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=1200&q=80',
        tags: ['Healthy', 'No-cook'],
        steps: [
          'Spoon yogurt into a bowl.',
          'Add berries and toasted oats.',
          'Drizzle honey and serve.'
        ]
      },
      {
        id: 3,
        title: 'Spiced Chickpea Wrap',
        description: 'Roasted chickpeas, crunchy veg, and tahini yogurt in a soft wrap.',
        category: 'lunch',
        duration: '20 mins',
        difficulty: 'Medium',
        diet: 'vegetarian',
        cuisine: 'asian',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
        tags: ['Vegetarian', 'Meal-prep'],
        steps: [
          'Roast chickpeas with spices.',
          'Mix tahini with yogurt and lemon.',
          'Layer veggies and chickpeas on wrap.',
          'Drizzle sauce and fold.'
        ]
      },
      {
        id: 4,
        title: 'Lemon Drizzle Cake',
        description: 'Soft loaf cake soaked with a bright, tangy lemon syrup glaze.',
        category: 'dessert',
        duration: '1 hr',
        difficulty: 'Medium',
        diet: 'vegetarian',
        cuisine: 'indian',
        image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80',
        tags: ['Baked', 'Sweet'],
        steps: [
          'Cream butter and sugar, add eggs.',
          'Fold in flour and lemon zest, bake.',
          'Pour lemon syrup over warm cake.',
          'Cool before slicing.'
        ]
      },
      {
        id: 5,
        title: 'Citrus Iced Tea',
        description: 'Black tea shaken with orange and lemon, lightly sweetened and chilled.',
        category: 'drinks',
        duration: '15 mins',
        difficulty: 'Easy',
        diet: 'vegetarian',
        cuisine: 'asian',
        image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=1200&q=80',
        tags: ['Cold', 'Batch'],
        steps: [
          'Brew black tea and cool.',
          'Add citrus juice and sweetener.',
          'Serve over ice with slices.'
        ]
      },
      {
        id: 6,
        title: 'Roasted Veggie Quinoa',
        description: 'Nutty quinoa with roasted seasonal veggies and lemon dressing.',
        category: 'dinner',
        duration: '35 mins',
        difficulty: 'Easy',
        diet: 'vegetarian',
        cuisine: 'italian',
        image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80',
        tags: ['Gluten-free', 'Prep'],
        steps: [
          'Roast chopped vegetables with olive oil.',
          'Simmer quinoa until fluffy.',
          'Toss quinoa with roasted veg and dressing.',
          'Finish with herbs and feta (optional).'
        ]
      }
    ];
  }

  private handleHttpError(err: any) {
    console.error('API error', err);
  }

  constructor(private http: HttpClient, private alertCtrl: AlertController) {}


  primaryCategory(recipe?: Recipe | null): string {
    if (!recipe) return '';
    const cats = recipe.categories || [];
    if (cats.length > 0) {
      return cats[0];
    }
    return recipe.category || '';
  }

}

export interface Recipe {
  id?: number;
  title: string;
  description: string;
  category: string;
  categories?: string[];
  duration: string;
  difficulty: string;
  diet: string;
  cuisine: string;
  image?: string;
  image_url?: string;
  tags: string[];
  steps?: string[];
}
