// Search Functionality
const searchInput = document.getElementById('searchInput');
const projectCards = document.querySelectorAll('.project-card');

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    projectCards.forEach(card => {
        const title = card.querySelector('.project-title').textContent.toLowerCase();
        const description = card.querySelector('.project-description').textContent.toLowerCase();
        const keywords = card.getAttribute('data-keywords') || '';
        const features = Array.from(card.querySelectorAll('.feature-tag'))
            .map(tag => tag.textContent.toLowerCase())
            .join(' ');
        const tech = Array.from(card.querySelectorAll('.tech-badge'))
            .map(badge => badge.textContent.toLowerCase())
            .join(' ');
        
        const searchableText = `${title} ${description} ${keywords} ${features} ${tech}`;
        
        if (searchableText.includes(searchTerm)) {
            card.parentElement.classList.remove('hidden');
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
    
    // Hide empty sections
    document.querySelectorAll('.section').forEach(section => {
        const visibleCards = section.querySelectorAll('.project-card:not([style*="display: none"])');
        if (visibleCards.length === 0 && searchTerm !== '') {
            section.style.display = 'none';
        } else {
            section.style.display = 'block';
        }
    });
});

// Throttle function for performance optimization
function throttle(func, wait) {
    let timeout;
    let lastRan;
    return function executedFunction(...args) {
        if (!lastRan) {
            func.apply(this, args);
            lastRan = Date.now();
        } else {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (Date.now() - lastRan >= wait) {
                    func.apply(this, args);
                    lastRan = Date.now();
                }
            }, wait - (Date.now() - lastRan));
        }
    };
}

// Back to Top Button
const backToTopButton = document.getElementById('backToTop');

backToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Smooth Scroll for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Animated Counter for Stats
const animateCounter = (element) => {
    const target = parseInt(element.getAttribute('data-target'));
    const duration = 2000; // 2 seconds
    const increment = target / (duration / 16); // 60fps
    let current = 0;
    
    const updateCounter = () => {
        current += increment;
        if (current < target) {
            element.textContent = Math.floor(current);
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    };
    
    updateCounter();
};

// Intersection Observer for Stats Animation
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(animateCounter);
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.stats-section');
if (statsSection) {
    statsObserver.observe(statsSection);
}

// Intersection Observer for Card Animations
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, index * 100);
            cardObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

// Apply initial styles and observe cards
projectCards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    cardObserver.observe(card);
});

// Combined scroll handler with throttling
let lastScroll = 0;
const navbar = document.querySelector('.navbar');
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');
const hero = document.querySelector('.hero');

const handleScroll = throttle(() => {
    const currentScroll = window.pageYOffset;
    
    // Back to top button visibility
    if (currentScroll > 300) {
        backToTopButton.classList.add('visible');
    } else {
        backToTopButton.classList.remove('visible');
    }
    
    // Navbar scroll effect
    if (currentScroll > lastScroll && currentScroll > 100) {
        // Scrolling down
        navbar.style.transform = 'translateY(-100%)';
    } else {
        // Scrolling up
        navbar.style.transform = 'translateY(0)';
    }
    lastScroll = currentScroll;
    
    // Active state for nav links
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (currentScroll >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
    
    // Parallax effect for hero section
    if (hero && currentScroll < window.innerHeight) {
        hero.style.transform = `translateY(${currentScroll * 0.5}px)`;
        hero.style.opacity = 1 - (currentScroll / window.innerHeight);
    }
}, 100);

window.addEventListener('scroll', handleScroll);

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Press '/' to focus search
    if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
    }
    
    // Press 'Escape' to clear search
    if (e.key === 'Escape' && document.activeElement === searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.blur();
    }
});

// Add tooltip for keyboard shortcuts
const searchBox = document.querySelector('.search-box');
const tooltip = document.createElement('div');
tooltip.textContent = 'Press "/" to search';
tooltip.style.cssText = `
    position: absolute;
    bottom: -25px;
    right: 0;
    font-size: 0.75rem;
    color: var(--text-muted);
    opacity: 0;
    transition: opacity 0.3s ease;
`;
searchBox.appendChild(tooltip);

// Show tooltip on page load briefly
setTimeout(() => {
    tooltip.style.opacity = '1';
    setTimeout(() => {
        tooltip.style.opacity = '0';
    }, 3000);
}, 1000);

// Set current year dynamically
document.getElementById('currentYear').textContent = new Date().getFullYear();

// Console Easter Egg
console.log('%c👋 Hello, Developer!', 'font-size: 20px; font-weight: bold; color: #6366f1;');
console.log('%cInterested in the code? Check out the repository:', 'font-size: 14px; color: #94a3b8;');
console.log('%chttps://github.com/JaredJomar/Projects', 'font-size: 14px; color: #10b981; font-weight: bold;');
