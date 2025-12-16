import { useState } from 'react';
import {
    HelpCircle, ChevronDown, ChevronUp, MessageCircle,
    Phone, Mail, MapPin, Clock, Send, FileText, Shield
} from 'lucide-react';

interface FAQItem {
    question: string;
    answer: string;
}

const faqs: FAQItem[] = [
    {
        question: 'How do I book a ticket?',
        answer: 'Simply search for your route on our homepage or Routes page, select your preferred trip, choose your seats, enter passenger details, and proceed to payment. You\'ll receive a confirmation email with your e-ticket.'
    },
    {
        question: 'Can I cancel or modify my booking?',
        answer: 'Yes, you can modify or cancel your booking up to 24 hours before departure. Go to your Dashboard, find the booking, and click "Modify" or "Cancel". Refund policies may apply depending on how close to departure you cancel.'
    },
    {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit/debit cards, bank transfers, and digital wallets. Payment is processed securely through our payment partner PayOS.'
    },
    {
        question: 'How do I get my e-ticket?',
        answer: 'After successful payment, your e-ticket will be sent to your email. You can also download it from your Dashboard under "My Bookings". Show the e-ticket (printed or on your phone) when boarding.'
    },
    {
        question: 'What if my bus is delayed?',
        answer: 'We will notify you via email and SMS if there are any delays. In case of significant delays, you may be eligible for compensation or rebooking. Contact our support team for assistance.'
    },
    {
        question: 'Is there a luggage limit?',
        answer: 'Each passenger is allowed 2 pieces of luggage (1 carry-on and 1 checked bag up to 20kg). Excess luggage may incur additional charges. Fragile or valuable items should be kept with you.'
    },
    {
        question: 'How early should I arrive at the station?',
        answer: 'We recommend arriving at least 15-30 minutes before departure to complete boarding. For major holidays, consider arriving earlier due to increased traffic.'
    },
    {
        question: 'Do you offer group discounts?',
        answer: 'Yes! Bookings of 4 or more seats qualify for group discounts. Use code FAMILY10 for 10% off. For larger groups (20+), contact our corporate sales team for special rates.'
    },
];

function FAQAccordion({ faqs }: { faqs: FAQItem[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="space-y-3">
            {faqs.map((faq, index) => (
                <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                    <button
                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <span className="font-medium text-gray-900 dark:text-white">{faq.question}</span>
                        {openIndex === index ? (
                            <ChevronUp className="h-5 w-5 text-blue-600" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                    </button>
                    {openIndex === index && (
                        <div className="px-6 pb-4 text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4">
                            {faq.answer}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function HelpPage() {
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Thank you for your message! We will get back to you within 24 hours.');
        setFormData({ name: '', email: '', subject: '', message: '' });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-16">
                <div className="container mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-4">
                        <HelpCircle className="h-5 w-5" />
                        <span>Support Center</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">How Can We Help?</h1>
                    <p className="text-xl text-teal-100 max-w-2xl mx-auto">
                        Find answers to common questions or get in touch with our support team
                    </p>
                </div>
            </div>

            {/* Quick Links */}
            <div className="container mx-auto px-4 -mt-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: <FileText className="h-6 w-6" />, label: 'Booking Policy', href: '#policy' },
                        { icon: <Shield className="h-6 w-6" />, label: 'Refund Info', href: '#refund' },
                        { icon: <MessageCircle className="h-6 w-6" />, label: 'Contact Us', href: '#contact' },
                        { icon: <HelpCircle className="h-6 w-6" />, label: 'FAQs', href: '#faq' },
                    ].map((item, i) => (
                        <a
                            key={i}
                            href={item.href}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
                        >
                            <div className="text-blue-600">{item.icon}</div>
                            <span className="font-medium text-gray-900 dark:text-white">{item.label}</span>
                        </a>
                    ))}
                </div>
            </div>

            {/* FAQ Section */}
            <section id="faq" className="py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
                            Frequently Asked Questions
                        </h2>
                        <FAQAccordion faqs={faqs} />
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-16 bg-white dark:bg-gray-800">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Contact Info */}
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                                Get in Touch
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-8">
                                Can't find what you're looking for? Our support team is here to help 24/7.
                            </p>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                                        <Phone className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Phone Support</h3>
                                        <p className="text-gray-600 dark:text-gray-400">1900-xxxx (24/7)</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600">
                                        <Mail className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Email</h3>
                                        <p className="text-gray-600 dark:text-gray-400">support@busbooking.vn</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600">
                                        <MapPin className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Office</h3>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            123 Nguyen Hue, District 1<br />Ho Chi Minh City, Vietnam
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600">
                                        <Clock className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Office Hours</h3>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Mon-Fri: 8:00 AM - 6:00 PM<br />Sat-Sun: 9:00 AM - 3:00 PM
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-8">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Send us a Message</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                                    <select
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Select a topic</option>
                                        <option value="booking">Booking Issue</option>
                                        <option value="payment">Payment Problem</option>
                                        <option value="refund">Refund Request</option>
                                        <option value="feedback">General Feedback</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
                                    <textarea
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        required
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Send className="h-5 w-5" />
                                    Send Message
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
