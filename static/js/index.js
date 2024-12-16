function goToCrazy() {
    localStorage.setItem('userInteracted', 'true');
    localStorage.setItem('autoplayRequested', 'true');
    window.history.pushState({page: 'crazy'}, '', '/');
    window.location.href = '/crazy';
}

document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.landing-button');
    buttons.forEach(button => {
        button.addEventListener('click', goToCrazy);
    });
});
