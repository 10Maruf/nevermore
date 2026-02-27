// Evermore Landing Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-item');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            // Add smooth scrolling behavior for internal links
            const targetId = this.getAttribute('href');
            if (targetId.startsWith('#')) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Add hover effects for CTA buttons
    const ctaButtons = document.querySelectorAll('.cta-button, .custom-cta');
    ctaButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0px 6px 8px 0px rgba(0, 0, 0, 0.35)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0px 4px 4px 0px rgba(0, 0, 0, 0.25)';
        });
    });

    // Add scroll effect for header
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.header');
        if (window.scrollY > 100) {
            header.style.background = 'rgba(0, 0, 0, 0.1)';
            header.style.backdropFilter = 'blur(10px)';
        } else {
            header.style.background = 'transparent';
            header.style.backdropFilter = 'none';
        }
    });

    // Add click handlers for section buttons
    const sectionButtons = document.querySelectorAll('.section-button');
    sectionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const buttonText = this.querySelector('span').textContent;
            console.log(`Clicked: ${buttonText}`);
            // Add navigation logic here
        });
    });

    // Add click handlers for category buttons
    const categoryButtons = document.querySelectorAll('.category-button');
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            const buttonText = this.querySelector('span').textContent;
            console.log(`Category clicked: ${buttonText}`);
            // Add category filtering logic here
        });
    });

    // Add click handlers for footer links
    const footerLinks = document.querySelectorAll('.footer-section a, .footer-links a');
    footerLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const linkText = this.textContent;
            console.log(`Footer link clicked: ${linkText}`);
            // Add navigation logic here
        });
    });

    // Add intersection observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.custom-content, .accessories, .new-arrivals');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add mobile menu toggle (for future mobile navigation)
    const createMobileMenu = () => {
        const nav = document.querySelector('.nav');
        const mobileMenuButton = document.createElement('button');
        mobileMenuButton.className = 'mobile-menu-toggle';
        mobileMenuButton.innerHTML = '☰';
        mobileMenuButton.style.display = 'none';
        nav.appendChild(mobileMenuButton);
    };

    // Initialize mobile menu
    createMobileMenu();

    // Handle window resize
    window.addEventListener('resize', function() {
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        if (window.innerWidth <= 768) {
            mobileToggle.style.display = 'block';
        } else {
            mobileToggle.style.display = 'none';
        }
    });

    console.log('Evermore Landing Page loaded successfully!');
});

