import React, { useEffect, useRef } from 'react';
import { EnhancedAgentSettings } from './EnhancedAgentSettings';
import { AgentCreationProvider } from '@/contexts/AgentCreationContext';

export function EnhancedAgentSettingsWrapper() {
  useEffect(() => {
    // After component mounts, find and apply enhanced styling to the original elements
    const enhanceElements = () => {
      // Apply card styles
      const cards = document.querySelectorAll('.AgentSettings .Card');
      cards.forEach(card => card.classList.add('enhanced-card'));
      
      // Apply card header styles
      const cardHeaders = document.querySelectorAll('.AgentSettings .CardHeader');
      cardHeaders.forEach(header => header.classList.add('enhanced-card-header'));
      
      // Apply card title styles
      const cardTitles = document.querySelectorAll('.AgentSettings .CardTitle');
      cardTitles.forEach(title => title.classList.add('enhanced-card-title'));
      
      // Apply card description styles
      const cardDescriptions = document.querySelectorAll('.AgentSettings .CardDescription');
      cardDescriptions.forEach(desc => desc.classList.add('enhanced-card-description'));
      
      // Apply card content styles
      const cardContents = document.querySelectorAll('.AgentSettings .CardContent');
      cardContents.forEach(content => content.classList.add('enhanced-card-content'));
      
      // Apply card footer styles
      const cardFooters = document.querySelectorAll('.AgentSettings .CardFooter');
      cardFooters.forEach(footer => footer.classList.add('enhanced-card-footer'));
      
      // Apply tabs list styles
      const tabsLists = document.querySelectorAll('.AgentSettings .TabsList');
      tabsLists.forEach(list => list.classList.add('enhanced-tabs-list'));
      
      // Apply tab trigger styles
      const tabTriggers = document.querySelectorAll('.AgentSettings .TabsTrigger');
      tabTriggers.forEach(trigger => {
        trigger.classList.add('enhanced-tab');
        trigger.classList.add('tab-hover');
      });
      
      // Apply input styles
      const inputs = document.querySelectorAll('.AgentSettings input, .AgentSettings textarea');
      inputs.forEach(input => input.classList.add('enhanced-input'));
      
      // Apply select styles
      const selects = document.querySelectorAll('.AgentSettings .Select trigger');
      selects.forEach(select => select.classList.add('enhanced-select'));
      
      // Apply button styles
      const buttons = document.querySelectorAll('.AgentSettings button');
      buttons.forEach(button => {
        button.classList.add('enhanced-button');
        button.classList.add('ripple-effect');
      });
      
      // Apply label styles
      const labels = document.querySelectorAll('.AgentSettings .Label');
      labels.forEach(label => label.classList.add('enhanced-label'));
    };
    
    // Run enhancement after a small delay to ensure all elements are rendered
    setTimeout(enhanceElements, 500);
    
    // Set up a mutation observer to apply styles to newly added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          enhanceElements();
        }
      });
    });
    
    // Start observing the document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return (
    <AgentCreationProvider>
      <EnhancedAgentSettings />
    </AgentCreationProvider>
  );
}