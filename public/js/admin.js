document.getElementById('playerForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const playerId = document.getElementById('playerId').value;
    const playerName = document.getElementById('playerName').value;
    const playerRole = document.getElementById('playerRole').value;
    const playerAge = document.getElementById('playerAge').value;
    const playerNation = document.getElementById('playerNation').value;
    const playerBPrice = document.getElementById('playerBPrice').value;
    const playerImageUrl = document.getElementById('playerImageUrl').value;

    const playerData = {
        id: playerId,
        name: playerName,
        role: playerRole,
        age: playerAge,
        nation: playerNation,
        bprice: playerBPrice,
        imageUrl: playerImageUrl
    };

    fetch('/api/players', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(playerData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(error => Promise.reject(error));
        }
        return response.json();
    })
    .then(data => {
        alert('Player added successfully');
        document.getElementById('playerForm').reset();
    })
    .catch(error => {
        console.error('Error:', error);
        alert(`Failed to add player: ${error.error}`);
    });
});
