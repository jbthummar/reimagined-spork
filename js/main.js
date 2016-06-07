(function() {

	/**
	* @class Helper
	* Class hold helper methods.
	**/
	var Helper = {

		/**
		* @method range
		* Returns array of integers ranging between start and end arguments.
		* @param start [ 0 ] start of range
		* @param end [ 0 ] end of range
		**/
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


	// Create Main app
	var PaymentApp = angular.module( 'PaymentApp', [] );

	/**
	* @filter orderObjectsByDate
	* orders object by dates (mm/dd/yyyy)
	@ param items array to be sorted
	@ param fieldName key for date value
	@ param reverse[ false ] pass true to sort array in descending order
	**/
	PaymentApp.filter('orderObjectsByDate', function() {
	  	return function( items, fieldName, reverse) {
		    	var filtered = [];
		    	angular.forEach(items, function(item) {
		      		filtered.push(item);
		    	});

		    	filtered.sort(function (a, b) {
		    		var arrTempA = a[fieldName].split('/'),
		    			arrTempB = b[fieldName].split('/');
		      		return ( new Date( arrTempA[2], arrTempA[0], arrTempA[1] ) > new Date( arrTempB[2], arrTempB[0], arrTempB[1] ) ? 1 : -1);
		    	});

		    	if(reverse) filtered.reverse();
		    	return filtered;
	  		};
	});


	/**
	* @service PaymentService angular service for payment app
	* Handles downloading app data and pagination calculation
	**/
	var PaymentService = PaymentApp.factory( 'PaymentService', function( $http, $q ) {

		var PaymentService = function() {};

		/**
		* @method getData 
		* fetched payment data from server
		**/
		PaymentService.prototype.getData = function() {
			var deferred = $q.defer(),
				self = this;
			$http.get('resources/data.json').then( function( response ) {
		        deferred.resolve(response.data);
		        console.log(response.data);
		    });
		    return deferred.promise;
		};

		/**
		* @method getPaginationData
		* Handles pagination logic
		* @param navingationObject object to represent  pagination data
		* pageNo [1]- page to navigate
		* pageSize [10]- total items per page
		* navigationSize [10] - maximum pages indexes shown at a time
		* offset [1] - minimum page indexes to be shown on right side of the active page index
		* totalItems - total items to paginate
		* startPage - index of first visible page index on navigation bar
		* endPage - index of last visible page index on navigation bar
		**/
		PaymentService.prototype.getPaginationData = function( navingationObject ) {
			var pageNo = navingationObject.pageNo || 1,
				pageSize = navingationObject.pageSize || 10,
				navigationSize = navingationObject.navigationSize || 10,
				offset = navingationObject.offset || 1;

			var totalPages = Math.ceil( navingationObject.totalItems/pageSize ),
				pages = [];

			startIndex = ( pageNo - 1 ) * pageSize + 1;
			endIndex = startIndex + pageSize - 1;

			// Range of indexes shown on navigation bar
			if( totalPages <= navigationSize ) {
				// incase all items can be contained in 1 page
				startPage = 1;
				endPage = totalPages;
			}
			else {
				if( pageNo === 1) {
					// If first page
					startPage = 1;
					endPage = startPage + navigationSize - 1;
				}
				else if( pageNo === totalPages ) {
					// If last page
					startPage = totalPages - navigationSize + 1;
					endPage = totalPages;
				}
				else if( pageNo === navingationObject.startPage ) {
					// if first visible page index on navigation bar
					startPage = ( navingationObject.startPage !== 1 ) ? navingationObject.startPage - 1 : 1;
					endPage = startPage + navigationSize - 1;
				}
				else if( pageNo === navingationObject.endPage ) {
					// if last visible page index on navigation bar
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

		return PaymentService;
	});
	PaymentService.$inject = [ '$http', '$q' ];

	/**
	* @controller PaymentController
	* Main angular controller for payment app.
	**/
	var PaymentController = PaymentApp.controller( 'PaymentController', function( $scope, $filter, PaymentService ) {

		var service = new PaymentService(),
			orderByFilter = $filter('orderBy'),
			activeEditingIndex = -1;
		
		/**
		* @method init
		* intializes controller data
		**/
		function init() {

			// Sort by options
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

			// Filter by paymentStatus options
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

			// Items per page options
			$scope.pageSizeOptions = [
				{ value : 5},
				{ value : 10},
				{ value : 15},
				{ value : 20},
				{ value : 25}
			];

			// active filter for payment status option
			$scope.paymentStatusFilter = '';
			// Sorting order of data( true - Ascending, false - Descending)
			$scope.sortOrder = true;

			// actuve sort by option
			$scope.sortBy = '';

			// Items per page selected option
			$scope.pageSize = 10;

			// Hold data( sorted & filtered ) to be rendered in view
			$scope.totalPayments = [];

			// Hold payment data to be rendered in active page
			$scope.payments = [];

			// Pagination status object
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

			// Fetch payment data
			service.getData().then( function( data ) { 
				$scope.totalPayments = data;
				$scope.origData = angular.extend( [], data );
				$scope.setPage(1);
				console.log(data);
			});
		};

		/**
		* @scopeMethod setPage
		* Called when to switch page
		**/
		$scope.setPage = function( pageNo ) {
			var navingationObject = {
				totalItems : $scope.totalPayments.length,
				pageNo : pageNo,
				currentPage	: $scope.pagination.currentPage,
				startPage : $scope.pagination.startPage,
				endPage : $scope.pagination.endPage,
				pageSize : $scope.pageSize, 
				navigationSize : 10,
				offset : 1
			};
			$scope.pagination = service.getPaginationData( navingationObject );
			$scope.pagination.currentPage = pageNo;
			$scope.payments = $scope.totalPayments.slice( $scope.pagination.startIndex - 1 , $scope.pagination.endIndex );
		}

		/** 
		* @scopeMethod sortData
		* Called when sorting option changed
		**/
		$scope.sortData = function() {
			sortAndFilter( $scope.sortBy.value, $scope.paymentStatusFilter.value );
			
			// $scope.payments = $scope.totalPayments.slice( $scope.pagination.startIndex - 1 , $scope.pagination.endIndex );
		};

		/** 
		* @scopeMethod filterByPaymentStatus
		* Called when filtering payment status option changed
		**/
		$scope.filterByPaymentStatus = function() {
			sortAndFilter( $scope.sortBy.value, $scope.paymentStatusFilter.value );
		};

		/** 
		* @scopeMethod editPaymentDetails
		* Called when edit payment button clicked
		* @param payment payment data to be edited
		**/
		$scope.editPaymentDetails = function( payment ) {
			activeEditingIndex = $scope.origData.indexOf( payment );
			resetEditModal( payment );
			$('#editModal').modal('show');
		}

		/** 
		* @scopeMethod deletePayment
		* Called when delete payment button clicked
		* @param payment payment data to be deleted
		**/
		$scope.deletePayment = function( payment ) {
			$scope.origData.splice( $scope.origData.indexOf( payment ), 1);
			sortAndFilter( $scope.sortBy.value, $scope.paymentStatusFilter.value );
		}

		/** 
		* @scopeMethod onAddPayment
		* Called when add payment form submitted
		* @param addPaymentForm add payment form instance
		**/
		$scope.onAddPayment = function ( addPaymentForm ) {
			if( !addPaymentForm.$valid ) {
				// If form is not filled properly
				addPaymentForm.$setSubmitted();
			} 
			else {
				// Add form data to payment data array
				$scope.origData.push( angular.extend( {}, $scope.addModal ));
				sortAndFilter( $scope.sortBy.value, $scope.paymentStatusFilter.value );
				resetAddModal();
				$('#addModal').modal('hide');
			}
		}

		/** 
		* @scopeMethod onEditPayment
		* Called when edit payment form submitted
		* @param editPaymentForm edit payment form instance
		**/
		$scope.onEditPayment = function ( editPaymentForm ) {
			if( !editPaymentForm.$valid ) 
			{
				editPaymentForm.$setSubmitted();
			} 
			else {
				angular.extend( $scope.origData[ activeEditingIndex ], $scope.editModal );
				sortAndFilter( $scope.sortBy.value, $scope.paymentStatusFilter.value );
				resetEditModal();
				$('#editModal').modal('hide');
			}
		}

		/** 
		* @scopeMethod onChangePageSize
		* Called when items per page option changed
		**/
		$scope.onChangePageSize = function () {
			$scope.setPage($scope.pagination.currentPage);
		}

		/**
		* @method sortAndFilter
		* Sorts and filters payment data by options selected
		* @param sortBy sort data by this field
		* @param filterBy filter data by this value of payment status
		**/
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
			$scope.totalPayments = $filter('filter')( filteredArray, { paymentStatus : filterBy });
			// reset rendering to first page
			$scope.setPage( 1 );
		}

		/**
		* @method resetAddModal
		* Resets add modal model
		**/
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

		/**
		* @method resetEditModal
		* Resets edit modal model
		* @param paymentObj if want to reset edit modal model by some value.
		**/
		function resetEditModal( paymentObj ) {

			if( paymentObj ) {
				$scope.editModal = {
					paymentId: paymentObj.paymentId,
					orderDate: paymentObj.orderDate,
					merchatId: paymentObj.merchatId,
					customerEmail: paymentObj.customerEmail,
					amount: paymentObj.amount,
					paymentStatus: paymentObj.paymentStatus
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

	PaymentController.$inject = [ '$scope', '$filter', 'PaymentService' ];

})();