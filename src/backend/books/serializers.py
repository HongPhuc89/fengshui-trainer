from rest_framework import serializers
from .models import BookCategory, Book, BookChapter, UserBookPurchase


class BookCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BookCategory
        fields = ('public_id', 'title', 'slug')


class BookChapterListSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookChapter
        fields = ('public_id', 'title', 'slug', 'order', 'is_demo', 'page_count')


class BookListSerializer(serializers.ModelSerializer):
    category = BookCategorySerializer(read_only=True)
    cover_image = serializers.SerializerMethodField()

    def get_cover_image(self, obj):
        if not obj.cover_image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.cover_image.url)
        return obj.cover_image.url

    class Meta:
        model = Book
        fields = (
            'public_id', 'title', 'slug', 'category', 'author', 'cover_image',
            'description', 'is_free', 'is_new_release', 'price_lt', 'published_date',
        )


class BookDetailSerializer(serializers.ModelSerializer):
    category = BookCategorySerializer(read_only=True)
    chapters = BookChapterListSerializer(many=True, read_only=True)
    cover_image = serializers.SerializerMethodField()
    final_exam_id = serializers.SerializerMethodField()

    def get_cover_image(self, obj):
        if not obj.cover_image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.cover_image.url)
        return obj.cover_image.url

    def get_final_exam_id(self, obj):
        return str(obj.final_exam_id) if obj.final_exam_id else None

    class Meta:
        model = Book
        fields = (
            'public_id', 'title', 'slug', 'category', 'author', 'cover_image',
            'description', 'is_free', 'is_new_release', 'price_lt', 'demo_content',
            'table_of_contents', 'published_date', 'chapters', 'final_exam_id',
        )


class BookDetailWithPurchaseSerializer(BookDetailSerializer):
    has_purchased = serializers.SerializerMethodField()

    def get_has_purchased(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return UserBookPurchase.objects.filter(user=request.user, book=obj).exists()

    class Meta(BookDetailSerializer.Meta):
        fields = BookDetailSerializer.Meta.fields + ('has_purchased',)


class WatermarkConfigSerializer(serializers.Serializer):
    display_name = serializers.CharField()
    phone_number = serializers.CharField()


class BookChapterContentSerializer(serializers.Serializer):
    public_id = serializers.UUIDField()
    title = serializers.CharField()
    order = serializers.IntegerField()
    file_url = serializers.CharField(allow_null=True)
    file_path = serializers.CharField(allow_null=True)
    page_count = serializers.IntegerField()
