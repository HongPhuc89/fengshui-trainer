from django.contrib import admin
from django.utils.text import slugify
from .models import BookCategory, Book, BookChapter, UserBookPurchase


@admin.register(BookCategory)
class BookCategoryAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug')
    prepopulated_fields = {'slug': ('title',)}

    def save_model(self, request, obj, form, change):
        if not obj.slug:
            obj.slug = slugify(obj.title)
        super().save_model(request, obj, form, change)


class BookChapterInline(admin.TabularInline):
    model = BookChapter
    extra = 0
    ordering = ('order',)


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'category', 'price_lt', 'is_free', 'is_new_release', 'published_date')
    list_filter = ('is_free', 'is_new_release', 'category')
    search_fields = ('title', 'author')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [BookChapterInline]

    def save_model(self, request, obj, form, change):
        if not obj.slug:
            obj.slug = slugify(obj.title)
        super().save_model(request, obj, form, change)


@admin.register(BookChapter)
class BookChapterAdmin(admin.ModelAdmin):
    list_display = ('book', 'title', 'order', 'is_demo')
    list_filter = ('is_demo',)
    search_fields = ('title', 'book__title')  # required for autocomplete_fields in TrainingSetAdmin
    raw_id_fields = ('book',)


@admin.register(UserBookPurchase)
class UserBookPurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'book', 'pdf_ready', 'created_at')
    list_filter = ('created_at', 'pdf_ready')
    raw_id_fields = ('user', 'book')
