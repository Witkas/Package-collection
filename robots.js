// These are all the roads that connect places in the village
const roads = [
    "Alice's House-Bob's House",   "Alice's House-Cabin",
    "Alice's House-Post Office",   "Bob's House-Town Hall",
    "Daria's House-Ernie's House", "Daria's House-Town Hall",
    "Ernie's House-Grete's House", "Grete's House-Farm",
    "Grete's House-Shop",          "Marketplace-Farm",
    "Marketplace-Post Office",     "Marketplace-Shop",
    "Marketplace-Town Hall",       "Shop-Town Hall"
];
/*  
Given an array of edges, this function constructs a graph in the form of object, which
properties are location-named. Each property's value is an array consisting of all neighbours
of that location.
Example: {
    "Alice's House": ["Bob's House", "Cabin", "Post Office"],
    "Bob's House": ["Alice's House", "Town Hall"],
    ...
}
*/
function buildGraph(edges) {               
    graph = Object.create(null);
    function addEdge(from, to) {
        if (graph[from] == null)
            graph[from] = [to];
        else
            graph[from].push(to);
    }

    for (let [from, to] of edges.map(e => e.split("-"))) {
        addEdge(from, to);
        addEdge(to, from);
    }
    return graph;
}

const roadGraph = buildGraph(roads);

/*
VillageState object represents the current state of the village. It consists of the
robot's current location, and an array of parcels that should be delivered. Each of the
parcels is an object that contains the current location of the parcel and its delivery location.
Example of a parcel: {
    "place": "Alice's House",
    "address": "Marketplace"
}
*/
class VillageState {
    constructor(place, parcels) {
        this.place = place;
        this.parcels = parcels;
    }

    /*
    This function returns a new VillageState object. It's given a destination that robot should move to.
    First, it checks whether the selected destination is valid. Then, it updates the parcels array, moving all 
    of the parcels that the robot is currently carrying to the new destination, except these that it delivers in
    the current location.
    */
    move(destination) {
        if(!roadGraph[this.place].includes(destination))
            return this;
        let parcels = this.parcels.map(
            p => {
                if (p.place != this.place)      // Packages that are waiting for collection in other locations are not moved
                    return p;
                else                            // These are the packages that the robot is carrying
                    return {place: destination, address: p.address};
            }
        ).filter(p => p.address != p.place);    // Get rid of the packages that we can deliver in current location

        return new VillageState(destination, parcels);
    }
    /*
    Returns a random VillageState object with a selected amount of parcels.
    */
    static random(parcelCount = 5) {
        let parcels = [];
        for (let i = 0; i < parcelCount; i++) {
            let address = randomPick(Object.keys(roadGraph));
            
            let place;
            do {
                place = randomPick(Object.keys(roadGraph));
            } while (place == address);     // We don't want the parcel to be sent from the same place it is addressed to
            parcels.push({place, address});
        }
        return new VillageState("Post Office", parcels);
    };
}
/*
This function is responsible for running the robot.
state  - the initial VillageState object
robot  - the type of robot that will be run. Robot is a function that takes a VillageState object and memory,
         and returns an object containing next direction and robot's memory
memory - an array used by the robot to make decisions
*/
function runRobot(state, robot, memory = []) {
    for (let turn = 0; ; turn++) {
        if (state.parcels.length == 0) {
            console.log(`Done in ${turn} turns`);
            return turn;
        }
        for (let parcel of state.parcels) {
            console.log(parcel);
        }
        let action = robot(state, memory);
        state = state.move(action.direction);
        memory = action.memory;
        console.log(`Moved to ${action.direction}`);
    }
}
// Picks random element from an array.
function randomPick(array) {
    let choice = Math.floor(Math.random() * array.length);
    return array[choice];
}
/*
Robot 1.
Selects the directions randomly and does not store anything in the memory.
*/
function randomRobot(state) {
    return {direction: randomPick(roadGraph[state.place])}
}


// A route that goes through every location in the village.
const mailRoute = [
    "Alice's House", "Cabin", "Alice's House", "Bob's House",
    "Town Hall", "Daria's House", "Ernie's House",
    "Grete's House", "Shop", "Grete's House", "Farm",
    "Marketplace", "Post Office"
];
/*
Robot 2.
Selects the directions according to the route above which is stored in the memory.
*/
function routeRobot(state, memory) {
    if (memory.length == 0)
        memory = mailRoute;
    return {direction: memory[0], memory: memory.slice(1)};
}

// Finds the shortest route (or one of them in there is many) in a given graph from the point A to B.
function findRoute(graph, from, to) {
    let work = [{at: from, route: []}];             // Work list consisting of object with current position and route travelled to that position
    for (let i = 0; i < work.length; i++) {
        let {at, route} = work[i];
        for (let place of graph[at]) {              // Iterate the array of the places that are next to the current location
            if (place == to) return route.concat(place);
            if (!work.some(w => w.at == place)) {   // Check if this place hasn't been visited yet (these are the only we're interested in)
                work.push({at: place, route: route.concat(place)});     // Add a new entry to the work list
            }
        }
    }
}
/*
Robot 3.
Follows the shortest route to reach the first parcel or if it is 
already collected, the shortest route to deliver it.
*/
function goalOrientedRobot({place, parcels}, route) {
    if (route.length == 0) {
        let parcel = parcels[0];
        if (parcel.place != place) {    // If the parcel is not collected yet
            route = findRoute(roadGraph, place, parcel.place);
        } else {                        // If the parcel is already collected
            route = findRoute(roadGraph, place, parcel.address);
        }
    }
    return {direction: route[0], memory: route.slice(1)};
}
// This function is used to compare the efficiency of many robots
function compareRobots(numberOfTimes, ...robots) {
    let total = {};
    for (i = 0; i < numberOfTimes; i++) {
        let state = VillageState.random();
        for (let robot of robots) {    
            if (i == 0) {
                total[robot.name] = 0;
            }
            let turns = runRobot(state, robot);
            total[robot.name] = total[robot.name] + turns;
        }
    }
    for (let robot of robots) {
        console.log(`${robot.name} average: ${total[robot.name] / numberOfTimes}`)
    }

}
/*
Finds all routes from A to B of the given length.
*/
function findRoutesByLength(graph, from, to, length) {
    let work = [{at: from, route: []}];             // Work list consisting of object with current position and route travelled to that position
    let routes = [];
    for (let i = 0; i < work.length; i++) {
        let {at, route} = work[i];
        if (route.length >= length)
            break;
        for (let place of graph[at]) {              // Iterate the array of the places that are next to the current location
            if (place == to) {
                routes.push(route.concat(place));
            }
            if (!work.some(w => w.at == place)) {   // Check if this place hasn't been visited yet (these are the only we're interested in)
                work.push({at: place, route: route.concat(place)});     // Add a new entry to the work list
            }
        }
    }
    return routes;
}
/*
Finds all of the shortest routes from A to B.
*/
function findRoutes(graph, from, to) {
    let length = findRoute(graph, from, to).length;         // Length is equal to the length of the first shortest path found
    routes = findRoutesByLength(graph, from, to, length);   // Find all routes of this length
    return routes;
}
/*
Counts the number of parcels to be collected/delivered on the given route.
*/
function countParcels(parcels, route) {
    let count = 0;
    for (let place of route) {
        for (let parcel of parcels) {
            if (place == parcel.place || place == parcel.address)
                count++;
        }
    }
    return count;
}
/*
Robot 4.
Works like the Robot 3, but when there is more than one path of the same length to the delivery address,
it chooses the path on which there are more parcels to collect/deliver.
Thus, the performence is slightly improved.
*/
function improvedGoalOrientedRobot({place, parcels}, route) {
    if (route.length == 0) {
        let parcel = parcels[0];
        let routes;
        if (parcel.place == place) {
            routes = findRoutes(roadGraph, place, parcel.address);
        }
        else {
            routes = findRoutes(roadGraph, place, parcel.place);
        }
        let maximumCount = routes.map(r => countParcels(parcels, r)).reduce((current, next) => {    // Find the number of parcels on each route
            if (next > current)
                return next;
            else
                return current;
        });
        let index = routes.map(r => countParcels(parcels, r)).indexOf(maximumCount);                // Find the index of the route in the array of routes
        route = routes[index];
    }
    return {direction: route[0], memory: route.slice(1)};
}

// compareRobots(1000, goalOrientedRobot, improvedGoalOrientedRobot);
village = VillageState.random(10);
runRobot(village, improvedGoalOrientedRobot);
