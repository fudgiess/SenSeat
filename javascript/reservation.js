// Go Inside/Outside

const indoorButton = document.getElementById('indoor-button');
const outdoorButton = document.getElementById('outdoor-button');

indoorButton.addEventListener("click", function() {
    const insideLayout = document.getElementById("inside-layout");
    const outsideLayout = document.getElementById("outside-layout");

    insideLayout.style.display = "none";
    outsideLayout.style.display = "grid";
});

outdoorButton.addEventListener("click", function() {
    const insideLayout = document.getElementById("inside-layout");
    const outsideLayout = document.getElementById("outside-layout");

    insideLayout.style.display = "grid";
    outsideLayout.style.display = "none";
});

// Change image on hover

document.querySelectorAll('.table').forEach(table => {
        const img = table.querySelector('img');
        const originalSrc = img.src;
        const hoverSrc = originalSrc.replace('available.png', 'table-select.png');

        table.addEventListener('mouseenter', () => {
            img.src = hoverSrc;
        });

        table.addEventListener('mouseleave', () => {
            img.src = originalSrc;
        });
    });