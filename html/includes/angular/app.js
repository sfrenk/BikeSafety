var OCEM = angular.module('BikeSafety', ['ngRoute', 'ui.bootstrap', 'ui.mask','firebase', 'leaflet-directive', 'LocalStorageModule']);

OCEM.constant('_',window._);

OCEM.config(['$routeProvider', '$locationProvider', 'localStorageServiceProvider', function($routeProvider, $locationProvider, localStorageServiceProvider) {
    $locationProvider.html5Mode(true);
    $routeProvider
    .when('/', {
        templateUrl: '/partials/MainMap',
        controller: 'mapController'
    })
    .when('/addAccident', {
        templateUrl: '/partials/AddAccident',
        controller: 'addAccidentController'
    })
    .otherwise({
        redirectTo: '/'
    });

    localStorageServiceProvider.setPrefix('bikesafety');
}]);

function makeMapColoredLinearly(arr,colors) {
    var result = {};
    var domainIntervals = d3.scale.ordinal()
        .domain(_.range(colors.length))
        .rangePoints([0,arr.length-1]);
    var arrayColorsFunction = d3.scale.linear()
        .domain(domainIntervals.range())
        .interpolate(d3.interpolateRgb)
        .range(colors);
    _.forEach(arr,function(val,index) {
        result[val] = arrayColorsFunction(index);
    });
    return result;
}

var booleans = [
    'Unknown',
    'Yes',
    'No'
];
var injuries = ['Unknown', 'No Injury', 'Evident Injury', 'Disabling Injury'];

var races = [
    'Unknown',
    'Asian',
    'Black',
    'Hispanic',
    'White',
    'Other'
];
var UNKNOWN_COLOR = '#aaaaaa';
var genders = [ 'Unknown', 'Female', 'Male' ];
// Given a dictionary of legend descriptions, return the color points to, and
// also take care of the 'Unknown' coloring
var mapColorToDictionaryFunction = function(map) {
    return function(d) {
        if (d in map) {
            return map[d];
        }
        if (d === 'Unknown') {
            return UNKNOWN_COLOR;
        }
        return 'hotpink';
    };
};
var yesNoMap = {
    No: '#FA6019',
    Yes: '#4E98C6'
};
var speeds = [
    'Unknown',
    '0-5 mph',
    '6-10 mph',
    '11-15 mph',
    '16-20 mph',
    '21-25 mph',
    '26-30 mph',
    '31-35 mph',
    '36-40 mph',
    '41-45 mph',
    '46-50 mph',
    '51-55 mph',
    '56-60 mph'
];
var speedColorMap = makeMapColoredLinearly(speeds.slice(1),colorbrewer.RdYlGn[10].reverse());
speedColorMap.Unknown = UNKNOWN_COLOR;
var speedColorsFunction = function(d) {
    return speedColorMap[d];
};

// Provide a conisistent coloring for 'Unknown' values
var defaultColoring = d3.scale.category10();
var unknownColoringFunction = function(d) {
    if (d === 'Unknown') {
        return UNKNOWN_COLOR;
    }
    return defaultColoring(d);
};

var bikerAndDriver = {
    age: {
        description: 'Age'
    },
    alcohol: {
        description: 'Intoxicated',
        type: 'list',
        options: booleans,
        colors: mapColorToDictionaryFunction(yesNoMap)
    },
    injury: {
        description: 'Injury',
        type: 'list',
        options: injuries,
        colors: unknownColoringFunction
    },
    race: {
        description: 'Race',
        type: 'list',
        options: races,
        colors: unknownColoringFunction
    },
    sex: {
        description: 'Gender',
        type: 'list',
        options: genders,
        colors: mapColorToDictionaryFunction({
            Male: '#FA6019',
            Female: '#4E98C6'
        })
    }
};

var biker = _.cloneDeep(bikerAndDriver);
biker.position = {
    options: ["Unknown","Bike Lane / Paved Shoulder","Driveway / Alley",
            "Non-Roadway", "Not Applicable", "Other",
            "Sidewalk / Crosswalk / Driveway Crossing",
            ],
    description: 'Location',
    colors: unknownColoringFunction
};
biker.direction = {
    options: ["Unknown","Facing Traffic","With Traffic",
              "Not Applicable"],
    description: 'Direction',
    colors: unknownColoringFunction
};
biker.had_helmet = {
    options: ["Unknown", "Yes", "No"],
    description: "Had Helmet",
    colors: unknownColoringFunction
};
biker.had_lights = {
    options: ["Unknown", "Yes", "No"],
    description: "Had Lights",
    colors: unknownColoringFunction
};
_.each(biker, function(v) {
    v.description = 'Bicyclist '+ v.description;
});

var driver = _.cloneDeep(bikerAndDriver);
driver.estimated_speed = {
    description: 'Speed',
    type: 'list',
    options: speeds,
    colors: speedColorsFunction
};
_.each(driver, function(v) {
    v.description = 'Driver '+ v.description;
});
driver.vehicle_type = {
    description: 'Vehicle Type',
    options: [
        "Unknown",
        "Commercial Bus",
        "Heavy Truck",
        "Light Truck (Mini-Van, Panel)",
        "Motorcycle",
        "Passenger Car",
        "Pedalcycle",
        "Pickup",
        "Police",
        "School Bus",
        "Single Unit Truck (2-Axle, 6-Tire)",
        "Sport Utility",
        "Van"
    ],
    colors: unknownColoringFunction
};

// The key names listed below match the column names in the Firebase table:
//
// The keys for each data item are used to render the legend on the map, and
// to populate the options on the 'add accident' page.
//
// Key details:
//   description:
//   type: Used to determine how to render the add accident form
//   options: For 'list' types, the list of valid options.
//   colors: A function that maps a value to a color. Used by the D3 library
//     to pick the color of the data point (and render the legend). If not
//     provided category10 is used.
var dataSetMapping = {
    biker: biker,
    crash: {
        ambulance: {
            description: 'Ambulance Called',
            type: 'list',
            options: booleans,
            colors: mapColorToDictionaryFunction(yesNoMap)
        },
        group: {},
        hit_and_run: {},
        light_conditions: {
            description: 'Light Conditions'
        },
        location: {},
        road_conditions: {
            description: 'Road Conditions',
            colors: mapColorToDictionaryFunction({
                Dry: '#FFA500',
                Wet: '#4E98C6'
            })
        },
        road_defects: {},
        timestamp: {},
        type: {},
        weather: {
            description: 'Weather',
            type: 'list',
            options: [
                'Unknown',
                'Clear',
                'Cloudy',
                'Rain'
            ],
            colors: mapColorToDictionaryFunction({
              'Clear': '#aec7e8',
              'Cloudy': '#c5b0d5',
              'Rain': '#1f77b4',
              'Other': '#e377c2',
              'Unknown': UNKNOWN_COLOR
            })
        },
        workzone: {
            description: 'Workzone',
            colors: mapColorToDictionaryFunction(yesNoMap)
        }
    },
    driver: driver,
    location: {
        characteristics: {},
        city: {},
        class: {
            description: 'Road Type'
        },
        configuration: {
            description: 'Road Division'
        },
        county: {},
        development: {},
        feature: {
            description: 'Road Feature'
        },
        lanes: {
            description: 'Lanes',
            type: 'list',
            options: [
              '1 lane',
              '2 lanes',
              '3 lanes',
              '4 lanes',
              '5 lanes',
              '6 lanes',
              '7 lanes',
              '8 lanes',
              'Unknown'
            ],
            colors: unknownColoringFunction
        },
        latitude: {},
        longitude: {},
        region: {},
        rural_urban: {},
        speed_limit: {},
        surface: {
            description: 'Surface',
            colors: mapColorToDictionaryFunction({
              'Smooth Asphalt': '#e377c2',
              'Coarse Asphalt': '#393b79',
              'Concrete': '#ffbb78',
              'Grooved Concrete': '#8c564b',
              'Other': '#aaaaaa'
            })
        },
        traffic_control: {
            description: 'Traffic Control',
            colors: mapColorToDictionaryFunction({
              'No Control Present': '#8c564b',
              'Stop Sign': '#d62728',
              'Stop And Go Signal': '#2ca02c',
              'Double Yellow Line, No Passing Zone': '#bcbd22',
              'Missing': UNKNOWN_COLOR,
              'Human Control': '#1f77b4',
              'Yield Sign': '#ff7f0e',
              'Other': UNKNOWN_COLOR
            }
            )
        }
    }
};

OCEM.service('dataSettings', function() {
    return {
        description: function(category, metric) {
            return dataSetMapping[category][metric].description || category +'.'+ metric;
        },
        data: function(category, metric) {
            return dataSetMapping[category][metric];
        }
    };
});

OCEM.service('getPaths', function($http) {
    return $http.get('/data/durham-bike-lanes.topojson');
});

OCEM.service('getCrashes', function($q, $firebase, localStorageService) {
    var deferred = $q.defer();

    var config = {
      apiKey: "AIzaSyCdqcOoSifQhH_RbJmtkFZS94l9jMwAcUc",
      authDomain: "bikesafetytwo.firebaseapp.com",
      databaseURL: "https://bikesafetytwo.firebaseio.com",
      storageBucket: "bikesafetytwo.appspot.com",
    };
    firebase.initializeApp(config);

    // see if we already have the crash data - its updated SOO rarely that it
    // doesn't make sense to poll for it every time:
    var cachedData = localStorageService.get('getCrashes');
    if (cachedData) {
        deferred.resolve(cachedData);
        return deferred.promise;
    }

    $('#pleaseWaitDialog').modal('show');
    var ref = firebase.database().ref('bicyclist_crashes');
    ref.orderByChild('location/county').equalTo('Durham').once('value', function(snapshot){
        deferred.resolve(snapshot.val());
        localStorageService.set('getCrashes',snapshot.val());
        $('#pleaseWaitDialog').modal('hide');
    });
    return deferred.promise;
});

OCEM.service('getCrashesUserSubmitted', function($q, $firebase) {
    $('#pleaseWaitDialog').modal('show');
    var deferred = $q.defer();
    var ref = firebase.database().ref('bicyclist_crashes_user_submitted');
    ref.once('value', function(snapshot){
        deferred.resolve({
          data: _.values(snapshot.val()),
          db: ref
        });
        $('#pleaseWaitDialog').modal('hide');
    });
    return deferred.promise;
});

OCEM.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push(function() {
        return {
            request: function(request) {
                if (request.method === 'GET') {
                    if (request.url.indexOf('.') === -1) {
                        var sep = request.url.indexOf('?') === -1 ? '?' : '&';
                        request.url = request.url + sep + 'cacheBust=' + new Date().getTime();
                    }
                }
                return request;
            }
        };
    });
}]);

OCEM.controller('headerController', ['$scope','$location',function($scope, $location) {
    $scope.paths = {
        '/': {
            label: 'Add Accident',
            next: '/addAccident'
        },
        '/addAccident': {
            label: 'View Map',
            next: '/'
        }
    };
    $scope.label = $scope.paths[$location.path()].label;
    $scope.togglePage = function() {
        $location.path($scope.paths[$location.path()].next);
        $scope.label = $scope.paths[$location.path()].label;
    };
}]);
