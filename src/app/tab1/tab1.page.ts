import { Component } from '@angular/core';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  menuItems = [
    {
      title: 'Recipes',
      subtitle: 'Home-cooked favorites and quick bites',
      icon: 'restaurant-outline',
      route: '/tabs/recipes'
    },
    {
      title: 'Blogs',
      subtitle: 'Stories, learnings, and personal notes',
      icon: 'book-outline',
      route: '/tabs/recipes'
    },
    {
      title: 'Travel',
      subtitle: 'City guides, itineraries, and highlights',
      icon: 'airplane-outline',
      route: '/tabs/recipes'
    },
    {
      title: 'Pics',
      subtitle: 'Photo diaries and visual snippets',
      icon: 'images-outline',
      route: '/tabs/tab3'
    },
    {
      title: 'About Me',
      subtitle: 'A quick intro and how to reach me',
      icon: 'person-circle-outline',
      route: '/tabs/tab3'
    }
  ];

  constructor() {}

}
