import { useState, useEffect } from 'react';
import StarIcon from '@mui/icons-material/Star';
import ChatIcon from '@mui/icons-material/Chat';
import PersonIcon from '@mui/icons-material/Person';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { reviewAPI } from '../lib/api';

interface Review {
    id: string;
    trip_id: string;
    user_id: string;
    booking_id: string;
    rating: number;
    title: string;
    comment: string;
    created_at: string;
    user?: {
        name: string;
        avatar?: string;
    };
}

interface ReviewStats {
    total_reviews: number;
    average_rating: number;
    rating_5_count: number;
    rating_4_count: number;
    rating_3_count: number;
    rating_2_count: number;
    rating_1_count: number;
}

interface TripReviewsProps {
    tripId: string;
}

export default function TripReviews({ tripId }: TripReviewsProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [expanded, setExpanded] = useState(true);

    useEffect(() => {
        loadReviews();
    }, [tripId, page]);

    const loadReviews = async () => {
        try {
            setLoading(true);
            const response = await reviewAPI.getTripReviews(tripId, page, 5);
            const data = response.data.data;
            setReviews(data.reviews || []);
            setStats(data.stats);
            setTotalPages(data.total_pages || 1);
        } catch (error) {
            console.error('Failed to load reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
        const fontSize = size === 'sm' ? 16 : 20;
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon
                        key={star}
                        sx={{ fontSize }}
                        className={`${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                    />
                ))}
            </div>
        );
    };

    const renderRatingBar = (count: number, total: number, label: string) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
            <div className="flex items-center gap-2 text-sm">
                <span className="w-6 text-gray-600">{label}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className="w-8 text-right text-gray-500">{count}</span>
            </div>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading && reviews.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <ChatIcon sx={{ fontSize: 20 }} className="text-blue-600" />
                    <h3 className="font-semibold text-lg">Customer Reviews</h3>
                    {stats && (
                        <span className="text-sm text-gray-500">
                            ({stats.total_reviews} {stats.total_reviews === 1 ? 'review' : 'reviews'})
                        </span>
                    )}
                </div>
                {expanded ? (
                    <ExpandLessIcon sx={{ fontSize: 20 }} className="text-gray-400" />
                ) : (
                    <ExpandMoreIcon sx={{ fontSize: 20 }} className="text-gray-400" />
                )}
            </button>

            {expanded && (
                <div className="p-6">
                    {/* Stats Summary */}
                    {stats && stats.total_reviews > 0 && (
                        <div className="flex flex-col md:flex-row gap-6 mb-6 pb-6 border-b">
                            {/* Average Rating */}
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-gray-900">
                                        {stats.average_rating.toFixed(1)}
                                    </div>
                                    {renderStars(Math.round(stats.average_rating), 'md')}
                                    <div className="text-sm text-gray-500 mt-1">
                                        {stats.total_reviews} reviews
                                    </div>
                                </div>
                            </div>

                            {/* Rating Distribution */}
                            <div className="flex-1 space-y-1">
                                {renderRatingBar(stats.rating_5_count, stats.total_reviews, '5★')}
                                {renderRatingBar(stats.rating_4_count, stats.total_reviews, '4★')}
                                {renderRatingBar(stats.rating_3_count, stats.total_reviews, '3★')}
                                {renderRatingBar(stats.rating_2_count, stats.total_reviews, '2★')}
                                {renderRatingBar(stats.rating_1_count, stats.total_reviews, '1★')}
                            </div>
                        </div>
                    )}

                    {/* Reviews List */}
                    {reviews.length > 0 ? (
                        <div className="space-y-4">
                            {reviews.map((review) => (
                                <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                            {review.user?.avatar ? (
                                                <img
                                                    src={review.user.avatar}
                                                    alt={review.user.name}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                <PersonIcon sx={{ fontSize: 20 }} className="text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium">
                                                    {review.user?.name || 'Anonymous'}
                                                </span>
                                                {renderStars(review.rating)}
                                                <span className="text-sm text-gray-400">
                                                    {formatDate(review.created_at)}
                                                </span>
                                            </div>
                                            {review.title && (
                                                <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                                            )}
                                            {review.comment && (
                                                <p className="text-gray-600 text-sm">{review.comment}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center gap-2 pt-4">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <span className="px-3 py-1 text-sm text-gray-600">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <ChatIcon sx={{ fontSize: 48 }} className="mx-auto mb-3 text-gray-300" />
                            <p>No reviews yet for this trip.</p>
                            <p className="text-sm mt-1">Be the first to share your experience!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
