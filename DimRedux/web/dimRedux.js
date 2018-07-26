// vim: sw=4:ts=4:nu:nospell
/*
 Copyright 2014 Fred Hutchinson Cancer Research Center
 Licensed under the Apache License, Version 2.0 (the 'License');
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an 'AS IS' BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

Ext.namespace('LABKEY.ext');

LABKEY.ext.dimRedux = Ext.extend( Ext.Panel, {

    // config is expected only to include a 'webPartDivId'
    // for use in the jQuery component
    constructor : function(config) {

        /////////////////////////////////////
        //            Variables            //
        /////////////////////////////////////

        var
            me                          = this,
            maskReport                  = undefined,
            fieldWidth                  = 250,
            labelWidth                  = 200,
            flagAssay                   = undefined
            ;

        var checkBtnsStatus = function(){
	        if (
		        cbAssays.isValid( true ) &&
                cbTimePoints.isValid( true ) &&
                rgTime.isValid( true ) &&
		        rgPlotType.isValid( true )
	        ){
		        btnRun.setDisabled( false );
	        } else {
		        btnRun.setDisabled( true );
 	        }

            if (    cbAssays.getValue()              == cbAssays.originalValue &&
                    cbTimePoints.getValue()          == cbTimePoints.originalValue &&
                    rgTime.getValue()                == rgTime.originalValue &&
		            rgPlotType.getValue()            == rgPlotType.originalValue
            ){
                btnReset.setDisabled( true );
            } else {
                btnReset.setDisabled( false );
            }
        };

        //Help strings
	        var
                timeAs_help = 'Using time as an observation allows for the labeling of points with time, not just by subject.',
                assays_help = 'Assays present in the study.',
                timepoints_help = 'The official study time collected value.',
                labels_help = 'Demographic data that can be used to label the scatter plot values from either a PCA or tSNE analysis.',
                plotTypes_help = 'Either Principle Components Analysis (PCA) or t-distributed Stochastic Neighbor Embedding (tSNE)'
                perplexity_help = 'Parameter passed to Rtsne',
                numComponents_help = 'Number of PCA components to plot pairwise',
                impute_help = "Method for imputing missing (NA) values",
                response_help = "Immune response data that can be used for labels if present"
            ;

        /////////////////////////////////////
        //           Stores                //
        /////////////////////////////////////

        var strTimePoints = new LABKEY.ext.Store({
            schemaName: 'study',
            queryName: 'DimRedux_timePoints',
            autoLoad: true 
        })
        
        var strAssays = new LABKEY.ext.Store({
            schemaName: 'study',
            queryName: 'DimRedux_Gathered',
            autoLoad: true
        })
        
        /////////////////////////////////////
        ///   timepoint v Assay Viz       ///
        /////////////////////////////////////

        // Setup for fields and data in gridPanel
        //var gridFields = [{name: 'Label', type: 'string'}];
        //var gridData = [];

        // Helper
        var arrUniq = function( el, i, arr){
            return( arr.indexOf(el) === i );
        }
        
        // Fill in gridData to show timepoints present
        // for each assay
        new LABKEY.Query.selectRows({
            schemaName: 'study',
            queryName: 'DimRedux_data_sets',
            success: function(data){
                // setup
                var gridCols = [{
                    header: '<b>Label</b>', 
                    dataIndex: 'Label',
                    width: 120
                }];

                var gridFields = ['Label'];
                var gridData = [];

                // Get col and row vals
                var tps = Ext.pluck( data.rows, "timepoint");
                var uniqTps = tps.filter( function( el, i, arr){
                    return( arr.indexOf(el) === i );
                });
                var lbls = Ext.pluck( data.rows, "Label");
                var uniqLbls = lbls.filter( function( el, i, arr){
                    return( arr.indexOf(el) === i );
                });
                
                // Fill empty values for gridData
                uniqLbls.forEach( function(lbl){
                    var rowArr = [lbl];
                    uniqTps.forEach( function(tp){
                        rowArr.push('');
                    });
                    gridData.push(rowArr);
                });
                
                uniqTps.forEach( function(tp){
                    gridCols.push({
                        header: "<b>" + tp + "</b>",
                        dataIndex: tp,
                        width: 90
                    });
                    gridFields.push(tp);
                });
                
                // Update gridData where tp present
                data.rows.forEach(function(row){
                    // get gridData row of assay
                    var lblIdx = uniqLbls.indexOf(row.Label);
                    var tpIdx = uniqTps.indexOf(row.timepoint);
                    // change corresponding tp value
                    gridData[lblIdx][tpIdx + 1] = 'x'; // +1 b/c label first
                });
                
                gridPnl = new Ext.grid.GridPanel({
                    store: new Ext.data.SimpleStore({
                        id: 0,
                        data: gridData,
                        fields: gridFields
                    }),
                    columns: gridCols,
                    viewConfig: {
                        forceFit: false
                    },
                    width: uniqTps.length * 90 + 120,
                    height: (uniqLbls.length + 1) * 33,
                    columnLines: true,
                    frame: true,
                    cls: 'custom-grid',
                });
                gridPnl.render('tpAssayGrid')
            }
        })
        
        /////////////////////////////////////
        ///      Check and ComboBoxes     ///
        /////////////////////////////////////
        
        var rgTime = new Ext.form.RadioGroup({
            allowBlank: false,
            fieldLabel: 'Use Time As',
            width: fieldWidth,
            columns: 2,
            items: [
                {
                    boxLabel: 'Variable',
                    checked: true,
                    inputValue: 'Variable',
                    name: 'Time',
                    value: 'variable'
                },{
                    boxLabel: 'Observation',
                    inputValue: 'Observation',
                    name: 'Time',
                    value: 'observation'

                }        
            ],
            value: 'Variable',
            listeners: {
                blur:       checkBtnsStatus,
                change:     function(){
                    // force new selection of timepoints and assays because
                    // assay options are affected by timeAs
                    cbTimePoints.disable();
                    cbTimePoints.clearValue();
                    cbTimePoints.enable();

                    cbAssays.disable();
                    cbAssays.clearValue();
                }
            },
            cls: 'ui-test-timebox'

        });

        // To ensure filtering from cbTimepoints works, need following:
        // 1. lastQuery - defaults to not reloading if query is same
        // 2. beforequery listener - defaults to true means reset
        // 3. other listeners - need to handle timepoint selection each
        // time or resets to original store
        var cbAssays = new Ext.ux.form.ExtendedLovCombo({
            allowBlank: false,
            displayField: 'Label',
            fieldLabel: 'Assays',
            lazyInit: false,
            disabled: true,
            listeners: {
                focus:      function(){
                    handleTpSelect();
                },
                change:     function(){
                    handleTpSelect();
                    checkBtnsStatus();
                },
                cleared:    function(){
                    handleTpSelect();
                    checkBtnsStatus();
                },
                select:     function(){
                    handleTpSelect();
                    checkBtnsStatus();
                },
                beforequery: function(qe){
                    qe.combo.onLoad(); // Loads store with current filter applied
                    return false; // Stops store from resetting to unfiltered
                }
            },
            separator: ',', // IMPORTANT FOR STRSPLIT FN
            store: strAssays,
            valueField: 'Name',
            width: fieldWidth,
            listWidth: fieldWidth,
            lastQuery: '', // If lastQuery is left as default then does not reload
            cls: 'ui-test-assays'
        });

        var handleTpSelect = function(){
            var tpsSelected = cbTimePoints.getValue().split(",");
            cbAssays.store.filterBy( function(record){
                var tpsAvailable = record.data.Timepoints.split(";");
                var intersect = tpsAvailable.filter( function(val){
                    return( tpsSelected.indexOf(val) !== -1) ;
                });
                var obs = rgTime.getValue().value == 'observation';
                if( (!obs & intersect.length > 0) | (obs & intersect.length == tpsSelected.length) ){
                    return(true)
                }
            });
        }

        var cbTimePoints = new Ext.ux.form.ExtendedLovCombo({
            allowBlank: false,
            displayField: 'Timepoints',
            fieldLabel: 'Assay Timepoints',
            lazyInit: false,
            disabled: false,
            listeners: {
                change:     function(){
                    checkBtnsStatus();
                },
                cleared:    function(){
                    cbAssays.disable();
                    cbAssays.reset();
                    checkBtnsStatus();
                },
                select:     function(){
                    cbAssays.disable();
                    cbAssays.clearValue();
                    handleTpSelect();
                    cbAssays.enable();
                }
            },
            separator: ',', // IMPORTANT FOR STRSPLIT FN
            store: strTimePoints,
            valueField: 'Timepoints',
            width: fieldWidth,
            cls: 'ui-test-timepoints'
        });
        
        var rgPlotType = new Ext.form.RadioGroup({
            allowBlank: false,
            fieldLabel: 'Plot type',
            width: fieldWidth,
            columns: 2,
            items: [
                {
                    boxLabel: 'PCA',
                    checked: true,
                    inputValue: 'PCA',
                    name: 'plotType',
                    value: 'PCA'
                },{
                    boxLabel: 'tSNE',
                    inputValue: 'tSNE',
                    name: 'plotType',
                    value: 'tSNE'
                }
            ],
            value: 'PCA',
            listeners: {
                blur:       checkBtnsStatus,
                change:     function(){
                    if(this.getValue().value == "tSNE"){
                        nmPerplexity.enable();
                    }else{
                        nmPerplexity.disable();
                    }
                    checkBtnsStatus;
                },
            },
            cls: 'ui-test-plottypes'
        });
        
        var nmPerplexity = new Ext.form.NumberField({
            allowBlank: false,
            fieldLabel: 'tSNE - Perplexity',
            width: fieldWidth,
            value: 5,
            maxValue: 50,
            minValue: 1,
            hidden: false,
            disabled: true
        });

        var nmNumComponents = new Ext.form.NumberField({
            allowBlank: false,
            fieldLabel: 'Components to Plot',
            width: fieldWidth,
            value: 2,
            maxValue: 6, 
            minValue: 2,
            hidden: false
        }); 

        var rgImpute = new Ext.form.RadioGroup({
            allowBlank: false,
            fieldLabel: 'Missing Value Imputation',
            width: fieldWidth,
            columns: 2,
            items: [
                {   
                    boxLabel: 'Mean',
                    checked: true,
                    inputValue: 'Mean',
                    name: 'Impute',
                    value: 'mean'
                },{ 
                    boxLabel: 'Median',
                    inputValue: 'Median',
                    name: 'Impute',
                    value: 'median'
                },{   
                    boxLabel: 'KNN',
                    inputValue: 'KNN',
                    name: 'Impute',
                    value: 'knn'
                },{ 
                    boxLabel: 'None',
                    inputValue: 'None',
                    name: 'Impute',
                    value: 'none'
                } 
            ],  
            value: 'Mean',
            listeners: {
                blur:       checkBtnsStatus,
                change:     checkBtnsStatus
            },  
            cls: 'ui-test-impute'
        }); 

        var rgResponse = new Ext.form.RadioGroup({
            allowBlank: false,
            fieldLabel: 'Immune Response Label',
            width: fieldWidth,
            columns: 2,
            items: [
                { 
                    boxLabel: 'HAI',
                    checked: true,
                    inputValue: 'HAI',
                    name: 'Response',
                    value: 'hai'
                },{
                    boxLabel: 'NAb',
                    inputValue: 'NAb',
                    name: 'Response',
                    value: 'neut_ab_titer'
                }
            ],
            value: 'HAI',
            listeners: {
                blur:       checkBtnsStatus,
                change:     checkBtnsStatus
            },
            cls: 'ui-test-responseLbl'
        });

        /////////////////////////////////////
        //    Buttons and Radio Groups     //
        /////////////////////////////////////
        
        var btnRun = new Ext.Button({
            disabled: true,
            handler: function(){
                setReportRunning( true );

                // Run Report
                inputParams = {
    
                    // Non-User Selected Params
                    baseUrl:                LABKEY.ActionURL.getBaseURL(),
                    folderPath:             LABKEY.ActionURL.getContainer(),
    
                    // User Selected Main Params
                    timeAs:                 rgTime.getValue().value,
                    assays:                 cbAssays.getValue(),
                    timePts:                cbTimePoints.getValue(),
                    plotType:               rgPlotType.getValue().value,
                    
                    // User Selected Additional Options
                    perplexity:             nmPerplexity.getValue(),
                    numComponents:          nmNumComponents.getValue(),
                    impute:                 rgImpute.getValue().value,
                    responseVar:            rgResponse.getValue().value
                };
                cnfReport.inputParams = inputParams;
                LABKEY.Report.execute( cnfReport );
            },
            text: 'Run'
        });

        var btnReset = new Ext.Button({
            disabled: true,
            handler: function(){
                Ext.each(
                    [
                        rgTime,
                        cbAssays,
                        cbTimePoints,
                        rgPlotType
                    ],
                    function( e ){ e.reset(); }
                );

                cntEmptyPnlView.setVisible( true );
                cntReport.setVisible( false );

                checkBtnsStatus();

                fsAdditionalOptions.collapse();
            },
            text: 'Reset'
        });


        /////////////////////////////////////
        //      Back-end Configuration     //
        /////////////////////////////////////
        
        var setReportRunning = function( bool ){
            if ( bool ){
                maskReport.show();
            } else {
                maskReport.hide();
            }
            // disable btns during report run
            Ext.each(
                [
                    cbAssays,
                    cbTimePoints,
                    rgPlotType,
                    tlbrBtns
                ],
                function( e ){ e.setDisabled( bool ); }
            );
        };

        var cnfReport = {
            failure: function( errorInfo, options, responseObj ){
                setReportRunning( false );

                LABKEY.ext.ISCore.onFailure( errorInfo, options, responseObj );
            },
            reportId: 'module:DimRedux/dimRedux.Rmd',
            success: function( result ){

                var errors = result.errors;
                var outputParams = result.outputParams;

                if ( errors && errors.length > 0 ){
                    setReportRunning( false );

                    // Trim to expected errors with useful info for user
                    errors = errors[0].match(/R Report Error(?:\s|\S)+/g);

                    // If unexpected R Report Error fail gracefully
                    if( errors == null){
                        errors = ["\nUnexpected Error in R Markdown Report. Please notify an adminstrator."]
                    }
                    LABKEY.ext.ISCore.onFailure({
                        exception: errors.join('\n')
                    });
                } else {
                    $('#'+cntReport.id).html(outputParams[0].value);

                    setReportRunning( false ); // Wait until all html is loaded

                    cntEmptyPnlView.setVisible( false );
                    cntReport.setVisible( true );

                    pnlTabs.setActiveTab( 1 );
                    window.HTMLWidgets.staticRender();
                }
            }
        };

        /////////////////////////////////////
        //  Panels, Containers, Components //
        /////////////////////////////////////

        var tlbrBtns = new Ext.Toolbar({
	    defaults: {
                width: 45
            },
            enableOverflow: true,
            items: [
                btnRun,
                btnReset
            ]
        });

        var
            cfTimePoints = LABKEY.ext.ISCore.factoryTooltipWrapper( cbTimePoints, 'Time point', timepoints_help )
         // cfLabel      = LABKEY.ext.ISCore.factoryTooltipWrapper( cbLabel, 'Label', labels_help )
        ;

        // var pnlInputs
        var cntEmptyPnlView = new Ext.Container({
            defaults: {
                border: false
            },
            items: [
                { html: 'Switch to the' },
                new Ext.Container({
                    autoEl: {
                        href: '#',
                        tag: 'a'
                    },
                    html: '&nbsp;\'Input\'&nbsp;',
                    listeners: {
                        afterrender: {
                            fn: function(){
                                this.getEl().on( 'click', function(){ pnlTabs.setActiveTab( 0 ); } );
                            },
                            single: true
                        }
                    }
                }),
                { html: 'tab, select the parameter values and click the \'RUN\' button to generate the report.' }
            ],
            layout: 'hbox'
        });

        var cntReport = new Ext.Container({
            defaults: {
                border: false
            },
            items: [],
            layout: 'fit'
        });

        var pnlView = new Ext.Panel({
            bodyStyle: 'padding: 1px;',
            defaults: {
                autoHeight: true,
                hideMode: 'offsets'
            },
            items: [ 
                cntEmptyPnlView, 
                cntReport ],
            layout: 'fit',
            tabTip: 'View',
            title: 'View'
        });


        var fsAdditionalOptions = new Ext.form.FieldSet({
            autoScroll: true,
            collapsed: true,
            collapsible: true,
            items: [
                LABKEY.ext.ISCore.factoryTooltipWrapper( nmPerplexity, 'tSNE perplexity', perplexity_help ),
                LABKEY.ext.ISCore.factoryTooltipWrapper( nmNumComponents, 'PCA components to plot', numComponents_help ),
                LABKEY.ext.ISCore.factoryTooltipWrapper( rgImpute, 'Impute', impute_help),
                LABKEY.ext.ISCore.factoryTooltipWrapper( rgResponse, 'Response', response_help)
            ],
            labelWidth: labelWidth,
            listeners: {
                afterrender: {
                    fn: function(){
                        this.on( 'collapse', checkBtnsStatus );
                    },
                    single: true
                },
                expand: checkBtnsStatus
            },
            title: 'Additional options',
            titleCollapse: true,
            cls: 'ui-test-additional-options'
        });

        var pnlInput = new Ext.form.FormPanel({
            bodyStyle: { paddingTop: '1px' },
            defaults: {
                autoHeight: true,
                forceLayout: true,
                hideMode: 'offsets'
            },
            deferredRender: false,
            items: [
                {
                    border: true,
                    title: 'Assay Data Available by Timepoint',
                    items: [
                        new Ext.Container({
                            items: [], 
                            layout: 'fit',
                            id: 'tpAssayGrid'
                        })
                    ]
                },
                new Ext.form.FieldSet({
                    autoScroll: true,
                    items: [
                        LABKEY.ext.ISCore.factoryTooltipWrapper( rgTime, 'Time Usage', timeAs_help),
                        LABKEY.ext.ISCore.factoryTooltipWrapper( cbTimePoints, 'Timepoints', timepoints_help ),
                        LABKEY.ext.ISCore.factoryTooltipWrapper( cbAssays, 'Assays', assays_help ),
                        LABKEY.ext.ISCore.factoryTooltipWrapper( rgPlotType, 'Plot Type', plotTypes_help ),
                    ],
                    title: 'Parameters',
                    cls: 'ui-test-parameters'
                }),
                fsAdditionalOptions,
                {
                    border: true,
                    items: [
                        tlbrBtns
                    ]
                }
            ],
            labelWidth: labelWidth,
            tabTip: 'Input',
            title: 'Input'
        });
        
        var pnlTabs = new Ext.TabPanel({
            activeTab: 0,
            autoHeight: true,
            defaults: {
                autoHeight: true,
                bodyStyle: 'padding: 4px;',
                border: false,
                forceLayout: true,
                hideMode: 'offsets',
                style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
            },
            deferredRender: false,
            forceLayout: true,
            items: [
                pnlInput,
                pnlView,
                {
                    defaults: {
                        autoHeight: true,
                        bodyStyle: 'padding-bottom: 1px;',
                        hideMode: 'offsets'
                    },
                    items: [
                        new Ext.form.Label(),
                        new Ext.form.FieldSet({
                            html: 'This module can be used to automatically run a PCA or tSNE dimension reduction analysis on selected study assay data and represent the resulting points with demographic-based labels for determining possible QC/QA concerns.',
                            style: 'margin-top: 5px;',
                            title: 'Description'
                        }),
                        new Ext.form.FieldSet({
                            html: 'Text about PCA and tSNE resources here.',
                            style: 'margin-top: 5px;',
                            title: 'Details'
                        }),
                        new Ext.form.FieldSet({
                            html: LABKEY.ext.ISCore.contributors,
                            style: 'margin-bottom: 2px; margin-top: 5px;',
                            title: 'Contributors'
                        })
                    ],
                    layout: 'fit',
                    tabTip: 'About',
                    title: 'About'
                },
            ],
            layoutOnTabChange: true,
            listeners: {
                afterrender: {
                    fn: function(){
                        maskReport = new Ext.LoadMask(
                            this.getEl(),
                            {
                                msg: LABKEY.ext.ISCore.generatingMessage,
                                msgCls: 'mask-loading'
                            }
                        );
                    },   
                    single: true 
                }
            },
            minTabWidth: 100,
            resizeTabs: true
        });
        
        //jquery related
        $('#' + config.webPartDivId)
            .parents('.panel-body')
            .prev()
            .find('.labkey-wp-title-text')
            .wrap(
                '<a href=\'' +
                LABKEY.ActionURL.buildURL(
                    'reports',
                    'runReport',
                    null,
                    {
                        reportId: 'module:DimRedux/reports/schemas/study/dimRedux.Rmd',
                        tabId: 'Source'
                    }
                ) +
                '\' target=\'_blank\' title=\'Click to open the knitr source code in a new window\'></a>'
);

        this.border         = false;
        this.boxMinWidth    = 370;
        this.cls            = 'ISCore';
        this.frame          = false;
        this.items          = pnlTabs;
        this.layout         = 'fit';
        this.renderTo       = config.webPartDivId;
        this.webPartDivId   = config.webPartDivId;
        this.width          = document.getElementById(config.webPartDivId).offsetWidth;

        LABKEY.ext.dimRedux.superclass.constructor.apply(this, arguments);

    }, // end constructor

    resize: function(){
    }
}); // end DimRedux Panel class

