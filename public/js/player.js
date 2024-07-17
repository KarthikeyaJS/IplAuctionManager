document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('playerId');

    if (playerId) {
        fetch(`/api/players/${playerId}`)
            .then(response => response.json())
            .then(player => {
                if (player.teamId) {
                    document.getElementById('playerDetails').innerHTML = 'This player has already been bought.';
                } else {
                    displayPlayerDetails(player);
                }
            })
            .catch(error => {
                console.error('Error fetching player information:', error);
                document.getElementById('playerDetails').innerHTML = 'Error fetching player information.';
            });
    }

    function displayPlayerDetails(player) {
        document.getElementById('playerDetails').innerHTML = `
            <h3>${player.name}</h3>
            <p>Role: ${player.role}</p>
            <p>Age: ${player.age}</p>
            <p>Nation: ${player.nation}</p>
            <p>Base Price: ${player.bprice}</p>
        `;
        document.getElementById('playerImage').innerHTML = `
            <img src="${player.imageUrl}" alt="${player.name}">
        `;
    }
});

function submitBid() {
    const bidPrice = document.getElementById('bidPrice').value;
    const teamID = document.getElementById('teamID').value.trim();
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('playerId');

    if (bidPrice && teamID) {
        fetch(`/api/players/${playerId}/bid`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bidPrice: parseInt(bidPrice, 10), teamID })
        })
        .then(response => response.json())
        .then(result => {
            console.log(result);
            if (result.error) {
                alert(`Error: ${result.error}`);
            } else {
                alert('Bid submitted successfully!');
                window.location.href = 'auction.html';
            }
        })
        .catch(error => {
            console.error('Error submitting bid:', error);
            alert('Failed to submit bid.');
        });
    } else {
        alert('Please enter both bid price and team ID.');
    }
}
