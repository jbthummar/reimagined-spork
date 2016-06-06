(function() {

	var Helper = {
		range : function ( start, end ) {
			var start = start | 0,
				end = end || 0,
				range = [];
			for( var i = start; i < end; i++ ) {
				range.push( i );
			}
			return range;
		}
	};


	var MerchantApp = angular.module( 'MerchantApp', [] );

	MerchantApp.filter('orderObjectsByDate', function() {
	  	return function( items, fieldName, reverse) {
		    	var filtered = [];
		    	angular.forEach(items, function(item) {
		      		filtered.push(item);
		    	});

		    	filtered.sort(function (a, b) {
		      		return (a[fieldName] > b[fieldName] ? 1 : -1);
		    	});

		    	if(reverse) filtered.reverse();
		    	return filtered;
	  		};
	});


	var MerchantService = MerchantApp.factory( 'MerchantService', function( $http, $q ) {

		var MerchantService = function() {};

		MerchantService.prototype.getData = function() {
			var deferred = $q.defer(),
				self = this;
			$http.get('resources/data.json').then( function( response ) {
		        deferred.resolve(response.data);
		        console.log(response.data);
		    });
		    return deferred.promise;
		};

		MerchantService.prototype.getPaginationData = function( navingationObject ) {
			var pageNo = navingationObject.pageNo || 1,
				pageSize = navingationObject.pageSize || 10,
				navigationSize = navingationObject.navigationSize || 10,
				rightOffset = navingationObject.rightOffset || 1;

			var totalPages = Math.ceil( navingationObject.totalItems/pageSize ),
				pages = [];

			startIndex = ( pageNo - 1 ) * pageSize + 1;
			endIndex = startIndex + pageSize - 1;

			if( totalPages <= navigationSize ) {
				startPage = 1;
				endPage = totalPages;
			}
			else {
				if( pageNo === 1) {
					startPage = 1;
					endPage = startPage + navigationSize - 1;
				}
				else if( pageNo === totalPages ) {
					startPage = totalPages - navigationSize + 1;
					endPage = totalPages;
				}
				else if( pageNo === navingationObject.startPage ) {
					startPage = ( navingationObject.startPage !== 1 ) ? navingationObject.startPage - 1 : 1;
					endPage = startPage + navigationSize - 1;
				}
				else if( pageNo === navingationObject.endPage ) {
					startPage = ( navingationObject.endPage !== totalPages ) ? navingationObject.startPage + 1 : navingationObject.startPage;
					endPage = startPage + navigationSize - 1;
				}
				else {
					startPage = navingationObject.startPage;
					endPage = navingationObject.endPage;
				}
			}

			pages = Helper.range( startPage, endPage + 1 );

			return {
				startIndex	: startIndex,
				endIndex	: endIndex,
				startPage	: startPage,
				endPage		: endPage,
				pages 		: pages,
				totalPages 	: totalPages
			};
		};

		return MerchantService;
	});
	MerchantService.$inject = [ '$http', '$q' ];

	var MerchantController = MerchantApp.controller( 'MerchantController', function( $scope, $filter, MerchantService ) {

		var service = new MerchantService(),
			orderByFilter = $filter('orderBy'),
			activeEditingIndex = -1;
		
		function init() {
			$scope.sortOptions = [ 
				{
					name: 'PaymentId',
					value: 'paymentId'
				},
				{
					name: 'OrderDate',
					value: 'orderDate'
				},
				{ 
					name: 'Amount',
					value: 'amount'
				}
			];
			$scope.paymentStatusOptions = [
				{
					name: 'All',
					value: ''
				},
				{
					name: 'Refunded',
					value: 'Refunded'
				},
				{
					name: 'Dropped',
					value: 'Dropped'
				},
				{ 
					name: 'Failed',
					value: 'Failed'
				},
				{ 
					name: 'Initiated',
					value: 'Initiated'
				},
				{ 
					name: 'Success',
					value: 'Success'
				}
			];
			$scope.pageSizeOptions = [
				{ value : 5},
				{ value : 10},
				{ value : 15},
				{ value : 20},
				{ value : 25}
			];
			$scope.paymentStatusFilter = '';
			$scope.sortOrder = true;
			$scope.sortBy = '';
			$scope.pageSize = 10;
			$scope.totalMerchants = [];
			$scope.merchants = [];
			$scope.pagination = {
				currentPage	: 1,
				pageSize 	: 10,
				startIndex	: 0,
				endIndex	: $scope.pageSize,
				startPage 	: 1,
				endPage 	: $scope.pageSize,
				pages 		: []
			};
			resetAddModal();
			resetEditModal();

			service.getData().then( function( data ) { 
				$scope.totalMerchants = data;
				$scope.origData = angular.extend( [], data );
				$scope.setPage(1);
				console.log(data);
			});
		};

		$scope.setPage = function( pageNo ) {
			var navingationObject = {
				totalItems : $scope.totalMerchants.length,
				pageNo : pageNo,
				currentPage	: $scope.pagination.currentPage,
				startPage : $scope.pagination.startPage,
				endPage : $scope.pagination.endPage,
				pageSize : $scope.pageSize, 
				navigationSize : 10,
				rightOffset : 1
			};
			$scope.pagination = service.getPaginationData( navingationObject );
			$scope.pagination.currentPage = pageNo;
			$scope.merchants = $scope.totalMerchants.slice( $scope.pagination.startIndex - 1 , $scope.pagination.endIndex );
		}

		$scope.sortData = function() {
			sortAndFilter( $scope.sortBy.value, $scope.paymentStatusFilter.value );
			
			// $scope.merchants = $scope.totalMerchants.slice( $scope.pagination.startIndex - 1 , $scope.pagination.endIndex );
		};

		$scope.filterByPaymentStatus = function() {
			sortAndFilter( $scope.sortBy.value, $scope.paymentStatusFilter.value );
		};

		$scope.editMerchantDetails = function( merchant ) {
			console.log( merchant );
			activeEditingIndex = $scope.origData.indexOf( merchant );
			resetEditModal( merchant );
			$('#editModal').modal('show');
		}

		$scope.deleteMerchant = function( merchant ) {
			$scope.origData.splice( $scope.origData.indexOf( merchant ), 1);
			sortAndFilter( $scope.sortBy.value, $scope.paymentStatusFilter.value );
		}

		$scope.onAddMerchant = function ( addMerchantForm ) {
			console.log(addMerchantForm);
			if( !addMerchantForm.$valid ) 
			{
				$scope.addMerchantForm.$setSubmitted();
			} 
			else {
				$scope.origData.push( angular.extend( {}, $scope.addModal ));
				sortAndFilter( $scope.sortBy.value, $scope.paymentStatusFilter.value );
				resetAddModal();
				$('#addModal').modal('hide');
			}
		}

		$scope.onEditMerchant = function ( editMerchantForm ) {
			console.log(editMerchantForm);
			if( !editMerchantForm.$valid ) 
			{
				$scope.editMerchantForm.$setSubmitted();
			} 
			else {
				angular.extend( $scope.origData[ activeEditingIndex ], $scope.editModal );
				sortAndFilter( $scope.sortBy.value, $scope.paymentStatusFilter.value );
				resetEditModal();
				$('#editModal').modal('hide');
			}
		}

		$scope.onChangePageSize = function () {
			$scope.setPage($scope.pagination.currentPage);
		}

		function  sortAndFilter( sortBy, filterBy ) {
			var filteredArray;
			switch( sortBy) {
				case 'paymentId': {
					filteredArray = orderByFilter( $scope.origData, 'paymentId', !$scope.sortOrder );
					break;
				}

				case 'amount': { 
					filteredArray = orderByFilter( $scope.origData, 'amount', !$scope.sortOrder );
					break;
				}

				case 'orderDate': { 
					filteredArray = $filter('orderObjectsByDate')( $scope.origData, 'orderDate', !$scope.sortOrder );
					break;
				}

				default : {
					filteredArray = $scope.origData;
				}
			}
			$scope.totalMerchants = $filter('filter')( filteredArray, { paymentStatus : filterBy });
			$scope.setPage( 1 );
		}

		function resetAddModal() {

			$scope.addModal = {
				paymentId: '',
				orderDate: '',
				merchatId: '',
				customerEmail:'',
				amount:'',
				paymentStatus: 'Refunded'
			};
		}

		function resetEditModal( merchantObj ) {

			if( merchantObj ) {
				$scope.editModal = {
					paymentId: merchantObj.paymentId,
					orderDate: merchantObj.orderDate,
					merchatId: merchantObj.merchatId,
					customerEmail: merchantObj.customerEmail,
					amount: merchantObj.amount,
					paymentStatus: merchantObj.paymentStatus
				};
			}
			else {
				$scope.editModal = {
					paymentId: '',
					orderDate: '',
					merchatId: '',
					customerEmail: '',
					amount: '',
					paymentStatus: 'Refunded'
				};
			}
			
		}

		init();
	});

	MerchantController.$inject = [ '$scope', '$filter', 'MerchantService' ];

})();