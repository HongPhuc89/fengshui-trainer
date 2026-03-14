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
    price_lt = serializers.SerializerMethodField()

    def get_cover_image(self, obj):
        if not obj.cover_image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.cover_image.url)
        return obj.cover_image.url

    def get_price_lt(self, obj):
        return 0 if obj.is_free else obj.price_lt

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
    price_lt = serializers.SerializerMethodField()

    def get_cover_image(self, obj):
        if not obj.cover_image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.cover_image.url)
        return obj.cover_image.url

    def get_final_exam_id(self, obj):
        return str(obj.final_exam_id) if obj.final_exam_id else None

    def get_price_lt(self, obj):
        return 0 if obj.is_free else obj.price_lt

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


class BookChapterContentSerializer(serializers.Serializer):
    public_id = serializers.UUIDField()
    title = serializers.CharField()
    order = serializers.IntegerField()
    file_url = serializers.CharField(allow_null=True)
    file_path = serializers.CharField(allow_null=True)
    page_count = serializers.IntegerField()
    encrypted_cdn_url = serializers.URLField(allow_null=True, required=False)
    has_training_set = serializers.SerializerMethodField()

    def get_has_training_set(self, chapter):
        """
        True nếu chapter có ít nhất 1 active TrainingActivity.
        Dùng để show/hide nút "Luyện tập" mà không cần gọi thêm API (§7.7).
        View phải prefetch training_set__activities để tránh N+1.
        """
        ts = getattr(chapter, 'training_set', None)
        if ts is None:
            return False
        return ts.activities.filter(is_active=True).exists()
