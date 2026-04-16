document.addEventListener('DOMContentLoaded', () => {

    // 1. Navbar Scroll Effect
    const header = document.getElementById('header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 2. Mobile Hamburger Menu
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            // Toggle hamburger icon
            const icon = hamburger.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
        
        // Close menu when a link is clicked
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = hamburger.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            });
        });
    }

    // 3. Q&A Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
        });
    });

    // 4. Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // 5. Language Switcher (I18N)
    const langBtn = document.getElementById('lang-switch');
    let currentLang = localStorage.getItem('bjd_lang') || 'id'; // Default language is Indonesian

    function updateLanguage(lang) {
        if (!translations || !translations[lang]) return;

        // Save selection to localStorage
        localStorage.setItem('bjd_lang', lang);

        // Change HTML lang attribute
        document.documentElement.lang = lang;

        // Process all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const isHTML = el.getAttribute('data-i18n-html') === 'true';
            
            if (translations[lang][key]) {
                if (isHTML) {
                    el.innerHTML = translations[lang][key];
                } else {
                    el.textContent = translations[lang][key];
                }
            }
        });
        
        // Change body class to update font if Japanese
        if(lang === 'ja') {
            document.body.style.fontFamily = "'Inter', 'Noto Sans JP', sans-serif";
        } else {
            document.body.style.fontFamily = "'Inter', sans-serif";
        }
    }

    if (langBtn) {
        langBtn.addEventListener('click', () => {
            currentLang = currentLang === 'id' ? 'ja' : 'id';
            updateLanguage(currentLang);
        });
    }

    // 6. Hero Video Mute Toggle
    const video = document.getElementById('hero-video');
    const muteBtn = document.getElementById('video-mute-toggle');

    if (video && muteBtn) {
        muteBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            
            // Update icon
            const icon = muteBtn.querySelector('i');
            if (video.muted) {
                icon.classList.remove('fa-volume-up');
                icon.classList.add('fa-volume-mute');
            } else {
                icon.classList.remove('fa-volume-mute');
                icon.classList.add('fa-volume-up');
            }
        });
    }

    // Initialize Language
    updateLanguage(currentLang);

});
